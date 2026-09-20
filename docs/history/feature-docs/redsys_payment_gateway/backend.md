# Backend Implementation Plan: Redsys Payment Gateway Integration

## Overview
This document provides a detailed implementation plan for integrating the Redsys payment gateway into our FastAPI backend following hexagonal architecture principles. The implementation covers license renewal with payment processing, price configuration, PDF invoice generation, and notification system.

## Table of Contents
1. [Dependencies and Libraries](#1-dependencies-and-libraries)
2. [Environment Configuration](#2-environment-configuration)
3. [Domain Layer Changes](#3-domain-layer-changes)
4. [Application Layer (New Use Cases)](#4-application-layer-new-use-cases)
5. [Infrastructure Layer](#5-infrastructure-layer)
6. [Redsys Integration Details](#6-redsys-integration-details)
7. [Security Considerations](#7-security-considerations)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Dependencies and Libraries

### Required New Dependencies

Add to `pyproject.toml`:

```toml
[tool.poetry.dependencies]
# Existing dependencies...
pycryptodome = "^3.20.0"  # For Redsys 3DES encryption and HMAC-SHA256
reportlab = "^4.0.9"      # For PDF invoice generation
pillow = "^10.2.0"        # PDF image support
aiosmtplib = "^3.0.1"     # Async email sending
jinja2 = "^3.1.3"         # Email template rendering
python-dateutil = "^2.8.2" # Date calculations for notifications
```

### Installation Command
```bash
poetry add pycryptodome reportlab pillow aiosmtplib jinja2 python-dateutil
```

### Why These Libraries?

1. **pycryptodome**: Official successor to pycrypto, required for Redsys's 3DES encryption and HMAC-SHA256 signature generation. More secure and actively maintained.

2. **reportlab**: Industry-standard PDF generation library for Python, well-documented and stable for invoice generation.

3. **aiosmtplib**: Async SMTP client compatible with FastAPI's async architecture.

4. **jinja2**: Already used by FastAPI, we'll use it for email templates.

---

## 2. Environment Configuration

### New Environment Variables

Add to `.env.example` and `.env`:

```env
# Redsys Configuration
REDSYS_MERCHANT_CODE=999008881  # FUC (merchant code)
REDSYS_TERMINAL=1
REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7  # 3DES key
REDSYS_ENVIRONMENT=test  # 'test' or 'production'
REDSYS_CURRENCY=978  # 978 = EUR

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourclub.com
SMTP_FROM_NAME=Club Management System

# Application URLs
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:8000

# Invoice Configuration
INVOICE_COMPANY_NAME=Your Martial Arts Federation
INVOICE_COMPANY_ADDRESS=Street Address, City, Postal Code
INVOICE_COMPANY_TAX_ID=B12345678
INVOICE_LOGO_PATH=/path/to/logo.png  # Optional
```

### Configuration Module

Create: `/backend/src/config/settings.py`

```python
"""Application settings and configuration."""

import os
from typing import Literal
from dotenv import load_dotenv

load_dotenv()


class RedsysSettings:
    """Redsys payment gateway settings."""

    MERCHANT_CODE: str = os.getenv("REDSYS_MERCHANT_CODE", "")
    TERMINAL: str = os.getenv("REDSYS_TERMINAL", "1")
    SECRET_KEY: str = os.getenv("REDSYS_SECRET_KEY", "")
    ENVIRONMENT: Literal["test", "production"] = os.getenv("REDSYS_ENVIRONMENT", "test")
    CURRENCY: str = os.getenv("REDSYS_CURRENCY", "978")  # EUR
    SIGNATURE_VERSION: str = "HMAC_SHA256_V1"

    @property
    def payment_url(self) -> str:
        """Get Redsys payment URL based on environment."""
        if self.ENVIRONMENT == "production":
            return "https://sis.redsys.es/sis/realizarPago"
        return "https://sis-t.redsys.es:25443/sis/realizarPago"

    def validate(self) -> None:
        """Validate required settings."""
        if not self.MERCHANT_CODE:
            raise ValueError("REDSYS_MERCHANT_CODE is required")
        if not self.SECRET_KEY:
            raise ValueError("REDSYS_SECRET_KEY is required")


class EmailSettings:
    """Email notification settings."""

    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Club Management")

    def validate(self) -> None:
        """Validate required settings."""
        if not self.SMTP_HOST:
            raise ValueError("SMTP_HOST is required")
        if not self.FROM_EMAIL:
            raise ValueError("SMTP_FROM_EMAIL is required")


class InvoiceSettings:
    """Invoice generation settings."""

    COMPANY_NAME: str = os.getenv("INVOICE_COMPANY_NAME", "")
    COMPANY_ADDRESS: str = os.getenv("INVOICE_COMPANY_ADDRESS", "")
    COMPANY_TAX_ID: str = os.getenv("INVOICE_COMPANY_TAX_ID", "")
    LOGO_PATH: str = os.getenv("INVOICE_LOGO_PATH", "")

    def validate(self) -> None:
        """Validate required settings."""
        if not self.COMPANY_NAME:
            raise ValueError("INVOICE_COMPANY_NAME is required")


class AppSettings:
    """Application-wide settings."""

    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    BACKEND_BASE_URL: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")


# Global settings instances
redsys_settings = RedsysSettings()
email_settings = EmailSettings()
invoice_settings = InvoiceSettings()
app_settings = AppSettings()
```

---

## 3. Domain Layer Changes

### 3.1 License Entity Modifications

**File**: `/backend/src/domain/entities/license.py`

**Changes Required**:

1. Add new enums for license categories:
```python
class TechnicalGrade(str, Enum):
    """Technical grade enumeration."""
    DAN = "dan"
    KYU = "kyu"


class InstructorCategory(str, Enum):
    """Instructor category enumeration."""
    FUKUSHIDOIN = "fukushidoin"  # Assistant instructor
    SHIDOIN = "shidoin"          # Instructor
    NONE = "none"                # Not an instructor


class AgeCategory(str, Enum):
    """Age category enumeration."""
    INFANTIL = "infantil"  # Children
    ADULTO = "adulto"      # Adult
```

2. Update License dataclass fields:
```python
@dataclass
class License:
    """License domain entity representing a federation license."""
    # Existing fields...
    id: Optional[str] = None
    license_number: str = ""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    association_id: Optional[str] = None
    grade: str = ""  # Specific grade value (e.g., "1st Dan", "3rd Kyu")
    status: LicenseStatus = LicenseStatus.ACTIVE
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    is_renewed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # NEW FIELDS - License Categories
    grado_tecnico: TechnicalGrade = TechnicalGrade.KYU
    categoria_instructor: InstructorCategory = InstructorCategory.NONE
    categoria_edad: AgeCategory = AgeCategory.ADULTO

    # Payment tracking
    last_payment_id: Optional[str] = None  # Link to last payment

    def __post_init__(self):
        """Validate the license entity."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()

        if not self.license_number or not self.license_number.strip():
            raise ValueError("License number cannot be empty")
        if not self.grade or not self.grade.strip():
            raise ValueError("Grade cannot be empty")

    def renew(self, new_expiration_date: datetime, payment_id: str) -> None:
        """Renew the license with payment tracking."""
        if not new_expiration_date:
            raise ValueError("Expiration date cannot be empty")
        if new_expiration_date <= datetime.now():
            raise ValueError("Expiration date must be in the future")
        if not payment_id:
            raise ValueError("Payment ID cannot be empty for renewal")

        self.expiration_date = new_expiration_date
        self.renewal_date = datetime.now()
        self.is_renewed = True
        self.status = LicenseStatus.ACTIVE
        self.last_payment_id = payment_id

    def get_license_type_key(self) -> str:
        """Get unique key for price lookup based on license characteristics."""
        # Format: "grado_tecnico-categoria_instructor-categoria_edad"
        # Examples: "dan-none-adulto", "kyu-fukushidoin-infantil"
        return f"{self.grado_tecnico}-{self.categoria_instructor}-{self.categoria_edad}"
```

**Remove the old LicenseType enum** since we now use separate category fields.

### 3.2 New Domain Entity: PriceConfiguration

**File**: `/backend/src/domain/entities/price_configuration.py`

```python
"""Price configuration domain entity."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PriceConfiguration:
    """Price configuration for license types."""

    id: Optional[str] = None
    license_type_key: str = ""  # Format: "grado_tecnico-categoria_instructor-categoria_edad"
    price: float = 0.0
    description: str = ""  # Human-readable description
    is_active: bool = True
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate price configuration."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()

        if not self.license_type_key or not self.license_type_key.strip():
            raise ValueError("License type key cannot be empty")
        if self.price < 0:
            raise ValueError("Price cannot be negative")
        if not self.description or not self.description.strip():
            raise ValueError("Description cannot be empty")

        # Validate license_type_key format
        parts = self.license_type_key.split("-")
        if len(parts) != 3:
            raise ValueError(
                "License type key must follow format: "
                "grado_tecnico-categoria_instructor-categoria_edad"
            )

    def is_valid_now(self) -> bool:
        """Check if price configuration is currently valid."""
        if not self.is_active:
            return False

        now = datetime.now()

        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False

        return True

    def deactivate(self) -> None:
        """Deactivate this price configuration."""
        self.is_active = False
        self.updated_at = datetime.now()
```

### 3.3 New Domain Entity: Invoice

**File**: `/backend/src/domain/entities/invoice.py`

```python
"""Invoice domain entity."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class InvoiceStatus(str, Enum):
    """Invoice status enumeration."""
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass
class InvoiceLineItem:
    """Invoice line item."""
    description: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        """Calculate line item total."""
        return self.quantity * self.unit_price


@dataclass
class Invoice:
    """Invoice domain entity."""

    id: Optional[str] = None
    invoice_number: str = ""
    payment_id: str = ""
    member_id: str = ""
    club_id: str = ""

    # Invoice details
    issue_date: datetime = None
    due_date: Optional[datetime] = None
    status: InvoiceStatus = InvoiceStatus.DRAFT

    # Amounts
    subtotal: float = 0.0
    tax_rate: float = 0.0  # Percentage (e.g., 21.0 for 21%)
    tax_amount: float = 0.0
    total_amount: float = 0.0

    # Line items
    items: list = None  # List[InvoiceLineItem]

    # Additional info
    notes: Optional[str] = None
    pdf_path: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Initialize and validate invoice."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        self.issue_date = self.issue_date or datetime.now()
        self.items = self.items or []

        if not self.invoice_number:
            raise ValueError("Invoice number cannot be empty")
        if not self.payment_id:
            raise ValueError("Payment ID cannot be empty")
        if not self.member_id:
            raise ValueError("Member ID cannot be empty")
        if self.total_amount < 0:
            raise ValueError("Total amount cannot be negative")

    def calculate_totals(self) -> None:
        """Calculate invoice totals from line items."""
        self.subtotal = sum(item.total for item in self.items)
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount

    def mark_as_paid(self) -> None:
        """Mark invoice as paid."""
        if self.status == InvoiceStatus.CANCELLED:
            raise ValueError("Cannot mark cancelled invoice as paid")
        self.status = InvoiceStatus.PAID
        self.updated_at = datetime.now()

    def cancel(self) -> None:
        """Cancel the invoice."""
        if self.status == InvoiceStatus.PAID:
            raise ValueError("Cannot cancel paid invoice")
        self.status = InvoiceStatus.CANCELLED
        self.updated_at = datetime.now()
```

### 3.4 New Domain Exceptions

**File**: `/backend/src/domain/exceptions/license.py`

Add new exceptions:

```python
class LicenseRenewalError(Exception):
    """Raised when license renewal fails."""
    pass


class InvalidLicenseCategoryError(Exception):
    """Raised when license category combination is invalid."""
    pass
```

**File**: `/backend/src/domain/exceptions/payment.py`

Add new exceptions:

```python
class RedsysSignatureError(Exception):
    """Raised when Redsys signature verification fails."""
    pass


class RedsysEncryptionError(Exception):
    """Raised when Redsys encryption fails."""
    pass
```

**File**: `/backend/src/domain/exceptions/price.py` (NEW)

```python
"""Price configuration exceptions."""


class PriceNotFoundError(Exception):
    """Raised when price configuration is not found."""
    pass


class InvalidPriceConfigurationError(Exception):
    """Raised when price configuration is invalid."""
    pass
```

---

## 4. Application Layer (New Use Cases)

### 4.1 Repository Ports

#### 4.1.1 Price Configuration Repository Port

**File**: `/backend/src/application/ports/price_configuration_repository.py`

```python
"""Repository port for price configuration."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.price_configuration import PriceConfiguration


class PriceConfigurationRepositoryPort(ABC):
    """Port for price configuration repository operations."""

    @abstractmethod
    async def find_all(self) -> List[PriceConfiguration]:
        """Find all price configurations."""
        pass

    @abstractmethod
    async def find_by_id(self, price_id: str) -> Optional[PriceConfiguration]:
        """Find a price configuration by ID."""
        pass

    @abstractmethod
    async def find_by_license_type_key(
        self, license_type_key: str
    ) -> Optional[PriceConfiguration]:
        """Find active price configuration by license type key."""
        pass

    @abstractmethod
    async def find_active_prices(self) -> List[PriceConfiguration]:
        """Find all active price configurations."""
        pass

    @abstractmethod
    async def create(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Create a new price configuration."""
        pass

    @abstractmethod
    async def update(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Update an existing price configuration."""
        pass

    @abstractmethod
    async def delete(self, price_id: str) -> bool:
        """Delete a price configuration."""
        pass

    @abstractmethod
    async def exists(self, price_id: str) -> bool:
        """Check if a price configuration exists."""
        pass
```

#### 4.1.2 Invoice Repository Port

**File**: `/backend/src/application/ports/invoice_repository.py`

```python
"""Repository port for invoices."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.invoice import Invoice


class InvoiceRepositoryPort(ABC):
    """Port for invoice repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Invoice]:
        """Find all invoices."""
        pass

    @abstractmethod
    async def find_by_id(self, invoice_id: str) -> Optional[Invoice]:
        """Find an invoice by ID."""
        pass

    @abstractmethod
    async def find_by_payment_id(self, payment_id: str) -> Optional[Invoice]:
        """Find invoice by payment ID."""
        pass

    @abstractmethod
    async def find_by_member_id(
        self, member_id: str, limit: int = 100
    ) -> List[Invoice]:
        """Find invoices by member ID."""
        pass

    @abstractmethod
    async def find_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        """Find invoice by invoice number."""
        pass

    @abstractmethod
    async def create(self, invoice: Invoice) -> Invoice:
        """Create a new invoice."""
        pass

    @abstractmethod
    async def update(self, invoice: Invoice) -> Invoice:
        """Update an existing invoice."""
        pass

    @abstractmethod
    async def delete(self, invoice_id: str) -> bool:
        """Delete an invoice."""
        pass

    @abstractmethod
    async def exists(self, invoice_id: str) -> bool:
        """Check if an invoice exists."""
        pass
```

#### 4.1.3 Email Service Port

**File**: `/backend/src/application/ports/email_service.py`

```python
"""Email service port."""

from abc import ABC, abstractmethod
from typing import List, Optional


class EmailServicePort(ABC):
    """Port for email service operations."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> bool:
        """Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (fallback)
            attachments: List of attachments [{"filename": str, "content": bytes}]

        Returns:
            True if email sent successfully
        """
        pass

    @abstractmethod
    async def send_license_renewal_reminder(
        self,
        to_email: str,
        member_name: str,
        license_number: str,
        expiration_date: str,
        days_until_expiration: int
    ) -> bool:
        """Send license renewal reminder email."""
        pass

    @abstractmethod
    async def send_invoice_email(
        self,
        to_email: str,
        member_name: str,
        invoice_number: str,
        invoice_pdf_path: str
    ) -> bool:
        """Send invoice email with PDF attachment."""
        pass
```

#### 4.1.4 PDF Service Port

**File**: `/backend/src/application/ports/pdf_service.py`

```python
"""PDF service port."""

from abc import ABC, abstractmethod

from src.domain.entities.invoice import Invoice


class PDFServicePort(ABC):
    """Port for PDF generation service."""

    @abstractmethod
    async def generate_invoice_pdf(self, invoice: Invoice, member_data: dict) -> str:
        """Generate invoice PDF.

        Args:
            invoice: Invoice entity
            member_data: Member information dict with keys:
                - name, email, address, tax_id, etc.

        Returns:
            Path to generated PDF file
        """
        pass
```

### 4.2 New Use Cases

#### 4.2.1 Calculate License Price

**File**: `/backend/src/application/use_cases/license/calculate_license_price_use_case.py`

```python
"""Calculate license price use case."""

from src.application.ports.price_configuration_repository import (
    PriceConfigurationRepositoryPort
)
from src.domain.entities.license import License
from src.domain.exceptions.price import PriceNotFoundError


class CalculateLicensePriceUseCase:
    """Use case for calculating license price based on type."""

    def __init__(
        self, price_configuration_repository: PriceConfigurationRepositoryPort
    ):
        self.price_repository = price_configuration_repository

    async def execute(self, license: License) -> float:
        """Execute the use case.

        Args:
            license: License entity with category fields set

        Returns:
            Price amount for the license type

        Raises:
            PriceNotFoundError: If no price configuration found
        """
        license_type_key = license.get_license_type_key()

        price_config = await self.price_repository.find_by_license_type_key(
            license_type_key
        )

        if not price_config:
            raise PriceNotFoundError(
                f"No price configuration found for license type: {license_type_key}"
            )

        if not price_config.is_valid_now():
            raise PriceNotFoundError(
                f"Price configuration for {license_type_key} is not currently valid"
            )

        return price_config.price
```

#### 4.2.2 Renew License with Payment

**File**: `/backend/src/application/use_cases/license/renew_license_with_payment_use_case.py`

```python
"""Renew license with payment use case."""

from datetime import datetime, timedelta
from typing import Optional

from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.domain.entities.license import License
from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.exceptions.license import LicenseNotFoundError, LicenseRenewalError


class RenewLicenseWithPaymentUseCase:
    """Use case for renewing a license after successful payment."""

    def __init__(
        self,
        license_repository: LicenseRepositoryPort,
        payment_repository: PaymentRepositoryPort
    ):
        self.license_repository = license_repository
        self.payment_repository = payment_repository

    async def execute(
        self, license_id: str, payment_id: str, renewal_years: int = 1
    ) -> License:
        """Execute the use case.

        Args:
            license_id: License to renew
            payment_id: Payment that was completed
            renewal_years: Number of years to renew (default 1)

        Returns:
            Updated license entity

        Raises:
            LicenseNotFoundError: If license not found
            LicenseRenewalError: If payment not completed or renewal fails
        """
        # Verify payment is completed
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise LicenseRenewalError(f"Payment {payment_id} not found")

        if payment.status != PaymentStatus.COMPLETED:
            raise LicenseRenewalError(
                f"Cannot renew license with payment status: {payment.status}"
            )

        # Get license
        license = await self.license_repository.find_by_id(license_id)
        if not license:
            raise LicenseNotFoundError(f"License {license_id} not found")

        # Calculate new expiration date
        # Start from current expiration if still valid, otherwise from now
        start_date = license.expiration_date if (
            license.expiration_date and license.expiration_date > datetime.now()
        ) else datetime.now()

        new_expiration = start_date + timedelta(days=365 * renewal_years)

        # Renew license
        license.renew(new_expiration, payment_id)

        # Update in repository
        updated_license = await self.license_repository.update(license)

        return updated_license
```

#### 4.2.3 Generate Invoice

**File**: `/backend/src/application/use_cases/invoice/generate_invoice_use_case.py`

```python
"""Generate invoice use case."""

from datetime import datetime

from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.exceptions.payment import PaymentNotFoundError


class GenerateInvoiceUseCase:
    """Use case for generating invoice after payment."""

    def __init__(
        self,
        invoice_repository: InvoiceRepositoryPort,
        payment_repository: PaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
        license_repository: LicenseRepositoryPort
    ):
        self.invoice_repository = invoice_repository
        self.payment_repository = payment_repository
        self.member_repository = member_repository
        self.license_repository = license_repository

    async def execute(self, payment_id: str) -> Invoice:
        """Execute the use case.

        Args:
            payment_id: Completed payment to generate invoice for

        Returns:
            Generated invoice entity

        Raises:
            PaymentNotFoundError: If payment not found
        """
        # Get payment
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")

        # Check if invoice already exists
        existing_invoice = await self.invoice_repository.find_by_payment_id(
            payment_id
        )
        if existing_invoice:
            return existing_invoice

        # Get member info
        member = await self.member_repository.find_by_id(payment.member_id)

        # Get license if applicable
        license = None
        if payment.related_entity_id:
            license = await self.license_repository.find_by_id(
                payment.related_entity_id
            )

        # Generate invoice number (year + sequential)
        invoice_number = await self._generate_invoice_number()

        # Create line items
        items = []
        description = self._get_payment_description(payment, license)
        items.append(
            InvoiceLineItem(
                description=description,
                quantity=1,
                unit_price=payment.amount
            )
        )

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            payment_id=payment.id,
            member_id=payment.member_id,
            club_id=payment.club_id,
            issue_date=datetime.now(),
            status=InvoiceStatus.ISSUED,
            tax_rate=0.0,  # Adjust if applicable
            items=items
        )

        invoice.calculate_totals()

        # Save invoice
        created_invoice = await self.invoice_repository.create(invoice)

        return created_invoice

    async def _generate_invoice_number(self) -> str:
        """Generate unique invoice number."""
        year = datetime.now().year
        # Get count of invoices this year
        all_invoices = await self.invoice_repository.find_all(limit=10000)
        year_invoices = [
            inv for inv in all_invoices
            if inv.invoice_number.startswith(str(year))
        ]
        next_number = len(year_invoices) + 1

        return f"{year}{next_number:06d}"  # e.g., 2026000001

    def _get_payment_description(self, payment, license) -> str:
        """Generate payment description for invoice."""
        if payment.payment_type == "license" and license:
            return (
                f"License Renewal - {license.license_number} - "
                f"{license.grado_tecnico.value.upper()} - "
                f"{license.categoria_edad.value.capitalize()}"
            )
        return f"Payment - {payment.payment_type}"
```

#### 4.2.4 Generate Invoice PDF

**File**: `/backend/src/application/use_cases/invoice/generate_invoice_pdf_use_case.py`

```python
"""Generate invoice PDF use case."""

from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.domain.exceptions.invoice import InvoiceNotFoundError


class GenerateInvoicePDFUseCase:
    """Use case for generating invoice PDF."""

    def __init__(
        self,
        invoice_repository: InvoiceRepositoryPort,
        member_repository: MemberRepositoryPort,
        pdf_service: PDFServicePort
    ):
        self.invoice_repository = invoice_repository
        self.member_repository = member_repository
        self.pdf_service = pdf_service

    async def execute(self, invoice_id: str) -> str:
        """Execute the use case.

        Args:
            invoice_id: Invoice to generate PDF for

        Returns:
            Path to generated PDF file

        Raises:
            InvoiceNotFoundError: If invoice not found
        """
        # Get invoice
        invoice = await self.invoice_repository.find_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundError(f"Invoice {invoice_id} not found")

        # Get member data
        member = await self.member_repository.find_by_id(invoice.member_id)

        member_data = {
            "name": f"{member.first_name} {member.last_name}" if member else "N/A",
            "email": member.email if member else "",
            "address": member.address if member else "",
            "tax_id": member.dni if member else ""
        }

        # Generate PDF
        pdf_path = await self.pdf_service.generate_invoice_pdf(invoice, member_data)

        # Update invoice with PDF path
        invoice.pdf_path = pdf_path
        await self.invoice_repository.update(invoice)

        return pdf_path
```

#### 4.2.5 Send License Renewal Notifications

**File**: `/backend/src/application/use_cases/notification/send_license_renewal_notifications_use_case.py`

```python
"""Send license renewal notifications use case."""

from datetime import datetime, timedelta
from typing import List

from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.email_service import EmailServicePort
from src.domain.entities.license import LicenseStatus


class SendLicenseRenewalNotificationsUseCase:
    """Use case for sending license renewal reminder emails."""

    def __init__(
        self,
        license_repository: LicenseRepositoryPort,
        member_repository: MemberRepositoryPort,
        email_service: EmailServicePort
    ):
        self.license_repository = license_repository
        self.member_repository = member_repository
        self.email_service = email_service

    async def execute(self, days_before: int = 30) -> List[str]:
        """Execute the use case.

        Args:
            days_before: Send notification X days before expiration

        Returns:
            List of member IDs who were notified
        """
        # Calculate target date range
        target_date = datetime.now() + timedelta(days=days_before)
        start_of_day = target_date.replace(hour=0, minute=0, second=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59)

        # Get all active licenses
        all_licenses = await self.license_repository.find_all(limit=10000)

        # Filter licenses expiring on target date
        expiring_licenses = [
            lic for lic in all_licenses
            if lic.status == LicenseStatus.ACTIVE
            and lic.expiration_date
            and start_of_day <= lic.expiration_date <= end_of_day
        ]

        notified_members = []

        for license in expiring_licenses:
            member = await self.member_repository.find_by_id(license.member_id)
            if not member or not member.email:
                continue

            # Send email
            success = await self.email_service.send_license_renewal_reminder(
                to_email=member.email,
                member_name=f"{member.first_name} {member.last_name}",
                license_number=license.license_number,
                expiration_date=license.expiration_date.strftime("%d/%m/%Y"),
                days_until_expiration=days_before
            )

            if success:
                notified_members.append(member.id)

        return notified_members
```

---

## 5. Infrastructure Layer

### 5.1 Redsys Integration Service

**File**: `/backend/src/infrastructure/adapters/services/redsys_service.py`

```python
"""Redsys payment gateway integration service."""

import base64
import json
import hmac
import hashlib
from typing import Dict, Optional
from Crypto.Cipher import DES3
from Crypto.Util.Padding import pad, unpad

from src.config.settings import redsys_settings
from src.domain.exceptions.payment import (
    RedsysEncryptionError,
    RedsysSignatureError
)


class RedsysService:
    """Service for Redsys payment gateway integration.

    Implements 3DES encryption and HMAC-SHA256 signature generation
    as required by Redsys API.

    References:
    - https://github.com/santiperez/node-redsys-api
    - https://canales.redsys.es/canales/ayuda/documentacion/
    """

    def __init__(self):
        self.merchant_code = redsys_settings.MERCHANT_CODE
        self.terminal = redsys_settings.TERMINAL
        self.secret_key = redsys_settings.SECRET_KEY
        self.currency = redsys_settings.CURRENCY
        self.signature_version = redsys_settings.SIGNATURE_VERSION

    def create_payment_request(
        self,
        order_id: str,
        amount: float,
        transaction_type: str = "0",  # 0 = Authorization
        merchant_url: str = "",
        url_ok: str = "",
        url_ko: str = ""
    ) -> Dict[str, str]:
        """Create Redsys payment request parameters.

        Args:
            order_id: Unique order identifier (4-12 alphanumeric chars)
            amount: Payment amount in euros
            transaction_type: Transaction type (0=Auth, 1=Preauth, etc.)
            merchant_url: Webhook callback URL
            url_ok: Success redirect URL
            url_ko: Failure redirect URL

        Returns:
            Dict with Redsys parameters:
                - Ds_SignatureVersion
                - Ds_MerchantParameters (Base64 encoded)
                - Ds_Signature (HMAC-SHA256)
        """
        # Convert amount to cents (Redsys expects integer cents)
        amount_cents = int(amount * 100)

        # Build merchant parameters JSON
        merchant_params = {
            "DS_MERCHANT_AMOUNT": str(amount_cents),
            "DS_MERCHANT_ORDER": self._format_order_id(order_id),
            "DS_MERCHANT_MERCHANTCODE": self.merchant_code,
            "DS_MERCHANT_CURRENCY": self.currency,
            "DS_MERCHANT_TRANSACTIONTYPE": transaction_type,
            "DS_MERCHANT_TERMINAL": self.terminal,
            "DS_MERCHANT_MERCHANTURL": merchant_url,
            "DS_MERCHANT_URLOK": url_ok,
            "DS_MERCHANT_URLKO": url_ko
        }

        # Encode parameters to Base64
        merchant_params_b64 = self._encode_parameters(merchant_params)

        # Generate signature
        signature = self._generate_signature(
            order_id, merchant_params_b64
        )

        return {
            "Ds_SignatureVersion": self.signature_version,
            "Ds_MerchantParameters": merchant_params_b64,
            "Ds_Signature": signature
        }

    def verify_webhook_signature(
        self, merchant_params_b64: str, signature_received: str
    ) -> bool:
        """Verify Redsys webhook signature.

        Args:
            merchant_params_b64: Base64 encoded merchant parameters from webhook
            signature_received: Signature received from Redsys

        Returns:
            True if signature is valid

        Raises:
            RedsysSignatureError: If signature verification fails
        """
        try:
            # Decode parameters
            params = self._decode_parameters(merchant_params_b64)
            order_id = params.get("Ds_Order")

            if not order_id:
                raise RedsysSignatureError("Order ID not found in webhook parameters")

            # Calculate expected signature
            expected_signature = self._generate_signature(
                order_id, merchant_params_b64
            )

            # Compare signatures (constant-time comparison)
            return hmac.compare_digest(expected_signature, signature_received)

        except Exception as e:
            raise RedsysSignatureError(f"Signature verification failed: {str(e)}")

    def decode_webhook_parameters(self, merchant_params_b64: str) -> Dict:
        """Decode merchant parameters from webhook.

        Args:
            merchant_params_b64: Base64 encoded parameters

        Returns:
            Decoded parameters dictionary
        """
        return self._decode_parameters(merchant_params_b64)

    def _format_order_id(self, order_id: str) -> str:
        """Format order ID to Redsys requirements.

        Order ID must be 4-12 alphanumeric characters.
        First 4 characters must be numeric.
        """
        # Ensure order_id is string
        order_str = str(order_id)

        # Pad with zeros if needed
        if len(order_str) < 4:
            order_str = order_str.zfill(4)

        # Truncate if too long
        if len(order_str) > 12:
            order_str = order_str[:12]

        return order_str

    def _encode_parameters(self, params: Dict) -> str:
        """Encode parameters to Base64 JSON string."""
        json_str = json.dumps(params)
        return base64.b64encode(json_str.encode('utf-8')).decode('utf-8')

    def _decode_parameters(self, params_b64: str) -> Dict:
        """Decode Base64 encoded parameters."""
        try:
            json_str = base64.b64decode(params_b64).decode('utf-8')
            return json.loads(json_str)
        except Exception as e:
            raise RedsysEncryptionError(f"Failed to decode parameters: {str(e)}")

    def _generate_signature(self, order_id: str, merchant_params_b64: str) -> str:
        """Generate HMAC-SHA256 signature.

        Process:
        1. Decode secret key from Base64
        2. Encrypt order ID with 3DES using the key
        3. Calculate HMAC-SHA256 of merchant parameters using encrypted key
        4. Encode result to Base64
        """
        try:
            # Decode secret key from Base64
            secret_key_bytes = base64.b64decode(self.secret_key)

            # Encrypt order ID with 3DES
            order_id_formatted = self._format_order_id(order_id)
            encrypted_order = self._encrypt_3des(
                order_id_formatted, secret_key_bytes
            )

            # Calculate HMAC-SHA256
            merchant_params_bytes = merchant_params_b64.encode('utf-8')
            signature_bytes = hmac.new(
                encrypted_order,
                merchant_params_bytes,
                hashlib.sha256
            ).digest()

            # Encode to Base64
            return base64.b64encode(signature_bytes).decode('utf-8')

        except Exception as e:
            raise RedsysEncryptionError(f"Failed to generate signature: {str(e)}")

    def _encrypt_3des(self, data: str, key: bytes) -> bytes:
        """Encrypt data using 3DES CBC mode.

        Args:
            data: String to encrypt
            key: 3DES key (24 bytes)

        Returns:
            Encrypted bytes
        """
        try:
            # Initialize 3DES cipher in CBC mode with zero IV
            iv = b'\0' * 8  # 8 bytes of zeros
            cipher = DES3.new(key, DES3.MODE_CBC, iv)

            # Pad data to block size (8 bytes for DES3)
            data_bytes = data.encode('utf-8')
            padded_data = pad(data_bytes, DES3.block_size)

            # Encrypt
            encrypted = cipher.encrypt(padded_data)

            return encrypted

        except Exception as e:
            raise RedsysEncryptionError(f"3DES encryption failed: {str(e)}")

    def _decrypt_3des(self, encrypted_data: bytes, key: bytes) -> str:
        """Decrypt 3DES encrypted data."""
        try:
            iv = b'\0' * 8
            cipher = DES3.new(key, DES3.MODE_CBC, iv)

            decrypted = cipher.decrypt(encrypted_data)
            unpadded = unpad(decrypted, DES3.block_size)

            return unpadded.decode('utf-8')

        except Exception as e:
            raise RedsysEncryptionError(f"3DES decryption failed: {str(e)}")
```

### 5.2 Email Service Implementation

**File**: `/backend/src/infrastructure/adapters/services/email_service.py`

```python
"""Email service implementation."""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

from src.application.ports.email_service import EmailServicePort
from src.config.settings import email_settings


class EmailService(EmailServicePort):
    """SMTP email service implementation."""

    def __init__(self):
        self.smtp_host = email_settings.SMTP_HOST
        self.smtp_port = email_settings.SMTP_PORT
        self.smtp_user = email_settings.SMTP_USER
        self.smtp_password = email_settings.SMTP_PASSWORD
        self.from_email = email_settings.FROM_EMAIL
        self.from_name = email_settings.FROM_NAME

        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent.parent.parent / "templates" / "emails"
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> bool:
        """Send an email via SMTP."""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message["Subject"] = subject

            # Attach text and HTML parts
            if text_body:
                message.attach(MIMEText(text_body, "plain"))
            message.attach(MIMEText(html_body, "html"))

            # Attach files if provided
            if attachments:
                for attachment in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(attachment["content"])
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename= {attachment['filename']}"
                    )
                    message.attach(part)

            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True
            )

            return True

        except Exception as e:
            # Log error (use proper logging in production)
            print(f"Failed to send email: {str(e)}")
            return False

    async def send_license_renewal_reminder(
        self,
        to_email: str,
        member_name: str,
        license_number: str,
        expiration_date: str,
        days_until_expiration: int
    ) -> bool:
        """Send license renewal reminder email."""
        template = self.jinja_env.get_template("license_renewal_reminder.html")

        html_body = template.render(
            member_name=member_name,
            license_number=license_number,
            expiration_date=expiration_date,
            days_until_expiration=days_until_expiration
        )

        subject = f"License Renewal Reminder - {days_until_expiration} days remaining"

        return await self.send_email(to_email, subject, html_body)

    async def send_invoice_email(
        self,
        to_email: str,
        member_name: str,
        invoice_number: str,
        invoice_pdf_path: str
    ) -> bool:
        """Send invoice email with PDF attachment."""
        template = self.jinja_env.get_template("invoice.html")

        html_body = template.render(
            member_name=member_name,
            invoice_number=invoice_number
        )

        # Read PDF file
        with open(invoice_pdf_path, "rb") as f:
            pdf_content = f.read()

        attachments = [
            {
                "filename": f"invoice_{invoice_number}.pdf",
                "content": pdf_content
            }
        ]

        subject = f"Invoice {invoice_number}"

        return await self.send_email(
            to_email, subject, html_body, attachments=attachments
        )
```

### 5.3 PDF Service Implementation

**File**: `/backend/src/infrastructure/adapters/services/pdf_service.py`

```python
"""PDF generation service implementation."""

from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib import colors

from src.application.ports.pdf_service import PDFServicePort
from src.domain.entities.invoice import Invoice
from src.config.settings import invoice_settings


class PDFService(PDFServicePort):
    """ReportLab PDF generation service."""

    def __init__(self):
        self.output_dir = Path("invoices")
        self.output_dir.mkdir(exist_ok=True)

    async def generate_invoice_pdf(
        self, invoice: Invoice, member_data: dict
    ) -> str:
        """Generate invoice PDF using ReportLab."""
        # Create PDF filename
        filename = f"invoice_{invoice.invoice_number}.pdf"
        filepath = self.output_dir / filename

        # Create document
        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        # Build PDF content
        elements = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )

        # Add logo if configured
        if invoice_settings.LOGO_PATH and Path(invoice_settings.LOGO_PATH).exists():
            logo = Image(invoice_settings.LOGO_PATH, width=4*cm, height=2*cm)
            elements.append(logo)
            elements.append(Spacer(1, 0.5*cm))

        # Title
        elements.append(Paragraph("INVOICE", title_style))
        elements.append(Spacer(1, 0.5*cm))

        # Company info
        company_info = [
            [Paragraph("<b>From:</b>", styles['Normal']), ""],
            [invoice_settings.COMPANY_NAME, ""],
            [invoice_settings.COMPANY_ADDRESS, ""],
            [f"Tax ID: {invoice_settings.COMPANY_TAX_ID}", ""]
        ]

        # Member info
        member_info = [
            [Paragraph("<b>To:</b>", styles['Normal'])],
            [member_data.get("name", "N/A")],
            [member_data.get("email", "")],
            [member_data.get("address", "")],
            [f"Tax ID: {member_data.get('tax_id', '')}"]
        ]

        # Invoice details
        invoice_details = [
            ["Invoice Number:", invoice.invoice_number],
            ["Issue Date:", invoice.issue_date.strftime("%d/%m/%Y")],
            ["Payment ID:", invoice.payment_id]
        ]

        # Create header table
        header_data = []
        for i in range(max(len(company_info), len(member_info))):
            row = []
            if i < len(company_info):
                row.extend(company_info[i])
            else:
                row.extend(["", ""])

            if i < len(member_info):
                row.append(member_info[i][0])
            else:
                row.append("")

            header_data.append(row)

        header_table = Table(header_data, colWidths=[6*cm, 1*cm, 6*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 9)
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, 1*cm))

        # Invoice details table
        details_table = Table(invoice_details, colWidths=[5*cm, 8*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8)
        ]))

        elements.append(details_table)
        elements.append(Spacer(1, 1*cm))

        # Line items
        items_data = [
            ["Description", "Quantity", "Unit Price", "Total"]
        ]

        for item in invoice.items:
            items_data.append([
                item.description,
                str(item.quantity),
                f"€{item.unit_price:.2f}",
                f"€{item.total:.2f}"
            ])

        items_table = Table(items_data, colWidths=[8*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, 0.5*cm))

        # Totals
        totals_data = [
            ["Subtotal:", f"€{invoice.subtotal:.2f}"],
            [f"Tax ({invoice.tax_rate}%):", f"€{invoice.tax_amount:.2f}"],
            ["Total:", f"€{invoice.total_amount:.2f}"]
        ]

        totals_table = Table(totals_data, colWidths=[13*cm, 3*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),
            ('TOPPADDING', (0, -1), (-1, -1), 10)
        ]))

        elements.append(totals_table)

        # Notes
        if invoice.notes:
            elements.append(Spacer(1, 1*cm))
            elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
            elements.append(Paragraph(invoice.notes, styles['Normal']))

        # Build PDF
        doc.build(elements)

        return str(filepath)
```

### 5.4 Update Initiate Redsys Payment Use Case

**File**: `/backend/src/application/use_cases/payment/initiate_redsys_payment_use_case.py`

Replace the TODO implementation with:

```python
"""Initiate Redsys Payment use case."""

from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.infrastructure.adapters.services.redsys_service import RedsysService
from src.config.settings import app_settings


class InitiateRedsysPaymentUseCase:
    """Use case for initiating payment through Redsys."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        redsys_service: RedsysService
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service

    async def execute(
        self,
        member_id: Optional[str],
        club_id: Optional[str],
        payment_type: str,
        amount: float,
        return_url: str,
        related_entity_id: Optional[str] = None
    ) -> dict:
        """Execute the use case and return Redsys parameters.

        Returns:
            Dict with:
                - payment_id: Created payment ID
                - redsys_url: Redsys payment gateway URL
                - redsys_params: Dict with Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature
        """
        # Create pending payment
        payment = Payment(
            member_id=member_id,
            club_id=club_id,
            payment_type=PaymentType(payment_type),
            amount=amount,
            status=PaymentStatus.PENDING,
            related_entity_id=related_entity_id
        )

        created_payment = await self.payment_repository.create(payment)

        # Mark as processing
        created_payment.mark_as_processing()
        await self.payment_repository.update(created_payment)

        # Generate Redsys parameters
        backend_url = app_settings.BACKEND_BASE_URL
        frontend_url = app_settings.FRONTEND_BASE_URL

        redsys_params = self.redsys_service.create_payment_request(
            order_id=created_payment.id,
            amount=amount,
            transaction_type="0",  # 0 = Authorization
            merchant_url=f"{backend_url}/api/payments/webhook",
            url_ok=f"{frontend_url}/payment/success?payment_id={created_payment.id}",
            url_ko=f"{frontend_url}/payment/failure?payment_id={created_payment.id}"
        )

        return {
            "payment_id": created_payment.id,
            "redsys_url": self.redsys_service.payment_url,
            "redsys_params": redsys_params
        }
```

### 5.5 Update Process Redsys Webhook Use Case

**File**: `/backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`

Replace with:

```python
"""Process Redsys Webhook use case."""

from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.exceptions.payment import PaymentNotFoundError, RedsysPaymentError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.infrastructure.adapters.services.redsys_service import RedsysService


class ProcessRedsysWebhookUseCase:
    """Use case for processing Redsys webhook callbacks."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        redsys_service: RedsysService
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service

    async def execute(
        self, merchant_params_b64: str, signature: str
    ) -> Payment:
        """Execute the use case.

        Args:
            merchant_params_b64: Base64 encoded merchant parameters from Redsys
            signature: Signature from Redsys (Ds_Signature)

        Returns:
            Updated payment entity

        Raises:
            RedsysPaymentError: If signature verification fails or payment processing fails
        """
        # Verify signature
        is_valid = self.redsys_service.verify_webhook_signature(
            merchant_params_b64, signature
        )

        if not is_valid:
            raise RedsysPaymentError("Invalid Redsys signature")

        # Decode parameters
        params = self.redsys_service.decode_webhook_parameters(merchant_params_b64)

        # Extract data
        order_id = params.get("Ds_Order")  # This is our payment_id
        response_code = params.get("Ds_Response")  # "0000" to "0099" = success
        auth_code = params.get("Ds_AuthorisationCode", "")

        # Find payment
        payment = await self.payment_repository.find_by_id(order_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {order_id} not found")

        # Process based on response code
        # Response codes 0000-0099 indicate success
        # Response codes 0100-9999 indicate errors
        if response_code and response_code.isdigit():
            response_int = int(response_code)

            if 0 <= response_int <= 99:
                # Success
                payment.complete_payment(
                    transaction_id=auth_code,
                    redsys_response=merchant_params_b64
                )
            else:
                # Failed
                error_msg = self._get_error_message(response_code)
                payment.fail_payment(f"Redsys error {response_code}: {error_msg}")
        else:
            payment.fail_payment("Invalid Redsys response code")

        return await self.payment_repository.update(payment)

    def _get_error_message(self, response_code: str) -> str:
        """Get human-readable error message for Redsys response code."""
        # Common Redsys error codes
        error_codes = {
            "0101": "Expired card",
            "0102": "Card in exception list",
            "0104": "Operation not allowed",
            "0106": "Exceeded attempts",
            "0116": "Insufficient funds",
            "0118": "Card not registered",
            "0125": "Card not valid",
            "0129": "CVV2/CVC2 error",
            "0180": "Card not valid",
            "0184": "Authentication error",
            "0190": "Transaction denied",
            "9104": "Transaction not allowed",
            "9253": "Card does not comply with check-digit",
            "9912": "Issuer not available"
        }

        return error_codes.get(response_code, "Unknown error")
```

### 5.6 MongoDB Repository Implementations

#### Price Configuration Repository

**File**: `/backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py`

```python
"""MongoDB implementation of price configuration repository."""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from src.application.ports.price_configuration_repository import (
    PriceConfigurationRepositoryPort
)
from src.domain.entities.price_configuration import PriceConfiguration


class MongoDBPriceConfigurationRepository(PriceConfigurationRepositoryPort):
    """MongoDB implementation of price configuration repository."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.collection = database.price_configurations

    async def find_all(self) -> List[PriceConfiguration]:
        """Find all price configurations."""
        cursor = self.collection.find()
        configs = []
        async for doc in cursor:
            configs.append(self._to_entity(doc))
        return configs

    async def find_by_id(self, price_id: str) -> Optional[PriceConfiguration]:
        """Find a price configuration by ID."""
        doc = await self.collection.find_one({"_id": ObjectId(price_id)})
        return self._to_entity(doc) if doc else None

    async def find_by_license_type_key(
        self, license_type_key: str
    ) -> Optional[PriceConfiguration]:
        """Find active price configuration by license type key."""
        doc = await self.collection.find_one({
            "license_type_key": license_type_key,
            "is_active": True
        })

        if not doc:
            return None

        config = self._to_entity(doc)

        # Verify it's currently valid
        if config.is_valid_now():
            return config

        return None

    async def find_active_prices(self) -> List[PriceConfiguration]:
        """Find all active price configurations."""
        cursor = self.collection.find({"is_active": True})
        configs = []
        async for doc in cursor:
            config = self._to_entity(doc)
            if config.is_valid_now():
                configs.append(config)
        return configs

    async def create(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Create a new price configuration."""
        doc = self._to_document(price_config)
        result = await self.collection.insert_one(doc)
        price_config.id = str(result.inserted_id)
        return price_config

    async def update(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Update an existing price configuration."""
        doc = self._to_document(price_config)
        await self.collection.update_one(
            {"_id": ObjectId(price_config.id)},
            {"$set": doc}
        )
        return price_config

    async def delete(self, price_id: str) -> bool:
        """Delete a price configuration."""
        result = await self.collection.delete_one({"_id": ObjectId(price_id)})
        return result.deleted_count > 0

    async def exists(self, price_id: str) -> bool:
        """Check if a price configuration exists."""
        count = await self.collection.count_documents({"_id": ObjectId(price_id)})
        return count > 0

    def _to_entity(self, doc: dict) -> PriceConfiguration:
        """Convert MongoDB document to entity."""
        return PriceConfiguration(
            id=str(doc["_id"]),
            license_type_key=doc.get("license_type_key", ""),
            price=doc.get("price", 0.0),
            description=doc.get("description", ""),
            is_active=doc.get("is_active", True),
            valid_from=doc.get("valid_from"),
            valid_until=doc.get("valid_until"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, entity: PriceConfiguration) -> dict:
        """Convert entity to MongoDB document."""
        doc = {
            "license_type_key": entity.license_type_key,
            "price": entity.price,
            "description": entity.description,
            "is_active": entity.is_active,
            "valid_from": entity.valid_from,
            "valid_until": entity.valid_until,
            "created_at": entity.created_at,
            "updated_at": entity.updated_at
        }

        if entity.id:
            doc["_id"] = ObjectId(entity.id)

        return doc
```

#### Invoice Repository

**File**: `/backend/src/infrastructure/adapters/repositories/mongodb_invoice_repository.py`

Similar structure to price configuration repository, implementing `InvoiceRepositoryPort`.

---

## 6. Redsys Integration Details

### 6.1 Understanding Redsys Flow

1. **Payment Initiation**:
   - Frontend calls `/api/payments/initiate`
   - Backend creates Payment entity (PENDING → PROCESSING)
   - Backend generates Redsys parameters with RedsysService
   - Returns parameters to frontend
   - Frontend submits form to Redsys payment page

2. **User Payment**:
   - User enters card details on Redsys page
   - Redsys processes payment
   - Redsys calls webhook URL (merchant_url)
   - Redsys redirects user to url_ok or url_ko

3. **Webhook Processing**:
   - Backend receives webhook with encrypted parameters
   - Verify signature using HMAC-SHA256
   - Decode parameters
   - Update payment status
   - Trigger post-payment actions (invoice, license renewal, email)

### 6.2 Security Best Practices

1. **Always verify webhook signatures** - never trust webhook data without signature verification
2. **Use constant-time comparison** for signatures (already implemented via `hmac.compare_digest`)
3. **Store secret key securely** - never commit to version control
4. **Use HTTPS** for webhook URLs in production
5. **Validate order IDs** - ensure they match expected format
6. **Log all webhook attempts** - for debugging and audit trail

### 6.3 Testing Strategy

Use Redsys test environment:
- URL: `https://sis-t.redsys.es:25443/sis/realizarPago`
- Test card: `4548812049400004`
- Expiry: Any future date
- CVV: `123`

---

## 7. Security Considerations

### 7.1 Webhook Endpoint Security

**File**: `/backend/src/infrastructure/web/routers/payments.py`

Update webhook endpoint:

```python
@router.post("/webhook")
async def redsys_webhook(
    webhook_data: dict,
    get_process_redsys_webhook_use_case = Depends(get_process_redsys_webhook_use_case)
):
    """Handle Redsys webhook callback.

    NOTE: This endpoint should NOT require authentication as it's called by Redsys.
    Security is ensured by signature verification.
    """
    merchant_params = webhook_data.get("Ds_MerchantParameters", "")
    signature = webhook_data.get("Ds_Signature", "")

    if not merchant_params or not signature:
        raise HTTPException(
            status_code=400,
            detail="Missing required Redsys parameters"
        )

    try:
        payment = await get_process_redsys_webhook_use_case.execute(
            merchant_params, signature
        )

        # Return minimal response (Redsys doesn't use it)
        return {"status": "ok"}

    except RedsysSignatureError as e:
        # Log security violation
        # In production, alert security team
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 7.2 Environment Variables Security

1. **Never commit `.env` file** - already in `.gitignore`
2. **Use strong secret keys** - generate with `openssl rand -base64 32`
3. **Rotate keys periodically** - especially after security incidents
4. **Use different keys for test/production**

### 7.3 Payment Data Security

1. **Never store card details** - Redsys handles this
2. **Store only transaction IDs and status**
3. **Use TLS/SSL for all communications**
4. **Implement rate limiting** on payment endpoints

---

## 8. Testing Strategy

### 8.1 Unit Tests

Create tests for:
- Domain entities validation
- Use case business logic
- Redsys encryption/signature generation
- Price calculation logic

**Example**: `/backend/tests/unit/test_redsys_service.py`

```python
import pytest
from src.infrastructure.adapters.services.redsys_service import RedsysService


class TestRedsysService:

    def test_create_payment_request(self):
        """Test payment request parameter generation."""
        service = RedsysService()

        params = service.create_payment_request(
            order_id="123456",
            amount=50.00,
            merchant_url="https://example.com/webhook",
            url_ok="https://example.com/success",
            url_ko="https://example.com/failure"
        )

        assert "Ds_SignatureVersion" in params
        assert "Ds_MerchantParameters" in params
        assert "Ds_Signature" in params
        assert params["Ds_SignatureVersion"] == "HMAC_SHA256_V1"

    def test_signature_verification(self):
        """Test signature verification."""
        service = RedsysService()

        # Generate request
        params = service.create_payment_request(
            order_id="123456",
            amount=50.00
        )

        # Verify signature
        is_valid = service.verify_webhook_signature(
            params["Ds_MerchantParameters"],
            params["Ds_Signature"]
        )

        assert is_valid is True

    def test_invalid_signature_fails(self):
        """Test that invalid signature is rejected."""
        service = RedsysService()

        params = service.create_payment_request(order_id="123456", amount=50.00)

        # Tamper with signature
        is_valid = service.verify_webhook_signature(
            params["Ds_MerchantParameters"],
            "INVALID_SIGNATURE"
        )

        assert is_valid is False
```

### 8.2 Integration Tests

Test complete flows:
- Payment initiation → Webhook → License renewal → Invoice → Email

### 8.3 Manual Testing Checklist

- [ ] Test payment with test card (success)
- [ ] Test payment with declined card (failure)
- [ ] Test webhook signature verification
- [ ] Test invoice PDF generation
- [ ] Test email sending
- [ ] Test license renewal after payment
- [ ] Test notification scheduling
- [ ] Test price configuration CRUD
- [ ] Test with expired licenses
- [ ] Test with multiple license types

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Add dependencies to `pyproject.toml`
- [ ] Create settings module
- [ ] Update `.env.example` with new variables
- [ ] Create domain entities (PriceConfiguration, Invoice)
- [ ] Update License entity with new fields
- [ ] Create domain exceptions

### Phase 2: Application Layer (Week 1-2)
- [ ] Create repository ports
- [ ] Implement use cases:
  - [ ] Calculate license price
  - [ ] Renew license with payment
  - [ ] Generate invoice
  - [ ] Generate invoice PDF
  - [ ] Send notifications

### Phase 3: Infrastructure (Week 2)
- [ ] Implement RedsysService
- [ ] Implement EmailService
- [ ] Implement PDFService
- [ ] Create MongoDB repositories
- [ ] Update payment use cases
- [ ] Create email templates

### Phase 4: Web Layer (Week 2-3)
- [ ] Update payment router
- [ ] Create price configuration router
- [ ] Create invoice router
- [ ] Update dependencies injection
- [ ] Create DTOs and mappers

### Phase 5: Testing (Week 3)
- [ ] Unit tests for services
- [ ] Integration tests for flows
- [ ] Manual testing with Redsys test environment
- [ ] Load testing for webhook endpoint

### Phase 6: Documentation & Deployment (Week 3-4)
- [ ] API documentation
- [ ] Deployment guide
- [ ] Environment setup guide
- [ ] Monitoring setup

---

## Important Notes for Implementation

### 1. Redsys Order ID Format
- **CRITICAL**: Order ID first 4 characters MUST be numeric
- Length: 4-12 alphanumeric characters
- Our implementation uses payment ObjectId (convert to ensure numeric prefix)
- Example format: `0001ABC123` (4 digits + alphanumeric)

### 2. Amount Handling
- Redsys expects amounts in **cents** (integer)
- Always multiply by 100 when sending to Redsys
- Example: 50.00 EUR → 5000

### 3. Webhook Endpoint
- Must be publicly accessible (use ngrok for local testing)
- Must NOT require authentication
- Should respond quickly (< 5 seconds)
- Redsys may retry failed webhooks

### 4. Email Templates
Create Jinja2 templates in `/backend/src/templates/emails/`:

**license_renewal_reminder.html**:
```html
<!DOCTYPE html>
<html>
<body>
    <h2>License Renewal Reminder</h2>
    <p>Dear {{ member_name }},</p>
    <p>Your license <strong>{{ license_number }}</strong> will expire in <strong>{{ days_until_expiration }} days</strong> on {{ expiration_date }}.</p>
    <p>Please renew your license to continue your membership.</p>
    <p>Best regards,<br>Club Management</p>
</body>
</html>
```

**invoice.html**: Similar structure for invoice notifications.

### 5. Background Jobs
Consider implementing a background job system (e.g., Celery or APScheduler) for:
- Sending notification emails (30, 15, 7 days before expiry)
- Checking license expirations daily
- Generating pending invoices

### 6. Migration Strategy
For existing licenses:
1. Create migration script to populate new category fields
2. Set default values based on old `license_type` field:
   - DAN → `grado_tecnico=DAN, categoria_instructor=NONE, categoria_edad=ADULTO`
   - KYU → `grado_tecnico=KYU, categoria_instructor=NONE, categoria_edad=ADULTO`
   - INSTRUCTOR → `grado_tecnico=DAN, categoria_instructor=SHIDOIN, categoria_edad=ADULTO`
3. Manually review and update as needed

### 7. Price Configuration Seed Data
Create initial price configurations:
```python
# Example seed data
prices = [
    {"key": "kyu-none-infantil", "price": 40.00, "desc": "Kyu Infantil"},
    {"key": "kyu-none-adulto", "price": 50.00, "desc": "Kyu Adulto"},
    {"key": "dan-none-infantil", "price": 60.00, "desc": "Dan Infantil"},
    {"key": "dan-none-adulto", "price": 70.00, "desc": "Dan Adulto"},
    {"key": "dan-fukushidoin-adulto", "price": 90.00, "desc": "Fukushidoin"},
    {"key": "dan-shidoin-adulto", "price": 120.00, "desc": "Shidoin"}
]
```

---

## Resources & References

### Official Redsys Documentation
- Manual de integración TPV Virtual: https://canales.redsys.es/canales/ayuda/documentacion/
- Test environment: https://sis-t.redsys.es:25443/sis/realizarPago
- Production environment: https://sis.redsys.es/sis/realizarPago

### Python Libraries Documentation
- pycryptodome: https://pycryptodome.readthedocs.io/
- ReportLab: https://www.reportlab.com/docs/reportlab-userguide.pdf
- aiosmtplib: https://aiosmtplib.readthedocs.io/

### Helpful Implementations
- Node.js Redsys: https://github.com/santiperez/node-redsys-api (reference for encryption logic)
- PHP Sermepa: https://github.com/ssheduardo/sermepa (Redsys implementation patterns)
- Python Redsys: https://github.com/ddiazpinto/python-redsys

---

## Questions to Resolve Before Implementation

1. **Invoice numbering**: Should we use year-based sequential (2026000001) or continuous?
2. **Tax rate**: What VAT/tax rate applies to license fees in Spain?
3. **Email provider**: Gmail SMTP or dedicated service (SendGrid, AWS SES)?
4. **File storage**: Where to store invoice PDFs? (local filesystem, S3, etc.)
5. **Background jobs**: Which scheduler to use for notifications?
6. **Monitoring**: What metrics to track? (payment success rate, webhook failures, etc.)

---

This implementation plan provides a comprehensive roadmap for integrating Redsys payment gateway with proper hexagonal architecture. Follow the phases sequentially and ensure thorough testing at each stage.
