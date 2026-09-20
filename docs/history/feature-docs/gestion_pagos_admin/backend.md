# Backend Implementation Plan — Gestión Manual de Pagos (Admin)

**Feature:** `gestion-pagos-admin`
**Date:** 2026-06-13
**Based on design:** `docs/plans/2026-06-13-gestion-pagos-admin-design.md`

---

## 0. Critical Pre-existing Issues Found During Research

Before implementing anything, be aware of these **bugs already in the codebase**:

### Bug A — `invoice.calculate_totals()` does not exist (BLOCKING)
- `process_redsys_webhook_use_case.py` line 274 calls `invoice.calculate_totals()`.
- The `Invoice` entity (`backend/src/domain/entities/invoice.py`) has NO public `calculate_totals()` — only `_recalculate_totals()` (private).
- **Fix required:** Add a public alias `def calculate_totals(self) -> None: self._recalculate_totals()` to `Invoice`. This must be done **before** the manual payment use case reuses the invoice-creation logic.

### Bug B — Invoice adapter/entity field name mismatch (EXISTING, NON-BLOCKING for new code)
The `MongoDBInvoiceRepository` (`mongodb_invoice_repository.py`) passes kwargs `tax_amount`, `total_amount`, `paid_date`, `license_id` in `_to_domain()` that **do not exist** on the `Invoice` dataclass. The entity fields are `tax_total`, `total` — no `paid_date` or `license_id` at all.
- This means reading invoices back from Mongo currently raises `TypeError` at runtime.
- **Do NOT replicate this pattern.** When calling `_create_invoice` in `RegisterManualPaymentUseCase`, construct `Invoice(...)` using only actual entity fields, then call `invoice.calculate_totals()` (or `invoice._recalculate_totals()`).
- In the cascade delete, wrap `invoice_repository.find_by_payment_id()` in a `try/except` to survive this existing bug.

---

## 1. `payment_method` Field — Exact Changes

### 1.1 New Enum + Field in `backend/src/domain/entities/payment.py`

**Insert after line 24 (after `PaymentType` class, before `@dataclass Payment`):**

```python
class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    REDSYS = "redsys"
    CASH = "cash"
    TRANSFER = "transfer"
    OTHER = "other"
```

**In the `Payment` dataclass, add field after `payer_name` (currently line 44):**

```python
payment_method: PaymentMethod = PaymentMethod.REDSYS
```

**In `__post_init__` (after line 53, after the `updated_at` assignment), add coercion block:**

```python
# Coerce string -> PaymentMethod; invalid value -> InvalidPaymentDataError
if isinstance(self.payment_method, str):
    try:
        self.payment_method = PaymentMethod(self.payment_method)
    except ValueError:
        from src.domain.exceptions.payment import InvalidPaymentDataError
        raise InvalidPaymentDataError(
            f"Invalid payment_method: '{self.payment_method}'"
        )
```

Note: The `InvalidPaymentDataError` import is placed inside `__post_init__` to avoid a potential circular import, since `payment.py` is a core domain module imported very early. If no circular import risk exists in this project, it can be moved to module top-level.

### 1.2 Adapter — `backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py`

**In `_to_domain` (lines 20-42), add after `member_assignments=doc.get("member_assignments")`:**

```python
payment_method=doc.get("payment_method", "redsys"),  # non-destructive default for existing docs
```

**In `_to_document` (lines 44-70), add to the `doc` dict alongside other scalar fields:**

```python
"payment_method": payment.payment_method.value,
```

### 1.3 `PaymentResponse` DTO — `backend/src/infrastructure/web/dto/payment_dto.py`

Add field to `PaymentResponse`:
```python
payment_method: str = "redsys"
```

### 1.4 `PaymentMapper.to_response_dto` — `backend/src/infrastructure/web/mappers_payment.py`

In `to_response_dto`, add to the `PaymentResponse(...)` constructor call:
```python
payment_method=entity.payment_method.value,
```

---

## 2. Invoice Entity Fix — `calculate_totals` Public Method

**File:** `backend/src/domain/entities/invoice.py`

**Add public method after `_recalculate_totals` (after line 139):**

```python
def calculate_totals(self) -> None:
    """Public alias for recalculating invoice totals (used after construction with line_items)."""
    self._recalculate_totals()
```

---

## 3. New Exception — `MemberPaymentNotFoundError`

**File:** `backend/src/domain/exceptions/payment.py`

**Add after existing `DuplicatePaymentForYearError` (after line 79):**

```python
class MemberPaymentNotFoundError(EntityNotFoundError):
    """Raised when a MemberPayment is not found."""

    def __init__(self, member_payment_id: str):
        super().__init__("MemberPayment", member_payment_id)
```

---

## 4. New Use Case — `RegisterManualPaymentUseCase`

**New file:** `backend/src/application/use_cases/payment/register_manual_payment_use_case.py`

### Imports:
```python
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod
from src.domain.entities.member_payment import (
    MemberPayment, MemberPaymentStatus, ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
)
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.application.use_cases.payment.initiate_annual_payment_use_case import PAYMENT_TYPE_TO_PRICE_KEY
from src.config.settings import get_invoice_settings
```

### Helper dataclasses:
```python
@dataclass
class ManualMemberAssignment:
    member_id: str
    member_name: str
    payment_types: List[str]  # item_type keys, e.g. "kyu", "seguro_accidentes"

    def to_dict(self) -> dict:
        return {
            "member_id": self.member_id,
            "member_name": self.member_name,
            "payment_types": self.payment_types,
        }


@dataclass
class RegisterManualPaymentResult:
    payment: Payment
    member_payments: List[MemberPayment]
    invoice: Optional[Invoice]
```

### Constructor:
```python
class RegisterManualPaymentUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        invoice_repository: InvoiceRepositoryPort,
        member_repository: MemberRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        pdf_service: Optional[PDFServicePort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository
        self.member_repository = member_repository
        self.price_configuration_repository = price_configuration_repository
        self.pdf_service = pdf_service
```

### `execute` body:
```python
    async def execute(
        self,
        payer_name: str,
        club_id: str,
        payment_year: int,
        payment_method: str,
        member_assignments: List[ManualMemberAssignment],
        include_club_fee: bool = False,
    ) -> RegisterManualPaymentResult:
        # 1. Validate inputs
        if not member_assignments:
            raise InvalidPaymentDataError("Al menos una línea de pago es requerida")

        # 2. Duplicate check per (member_id, payment_type, payment_year)
        for assignment in member_assignments:
            for ptype in assignment.payment_types:
                if ptype == "club_fee":
                    continue  # handled separately
                mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if mp_type is None:
                    continue
                already_exists = await self.member_payment_repository.exists_for_member_year_type(
                    member_id=assignment.member_id,
                    payment_year=payment_year,
                    payment_type=mp_type,
                )
                if already_exists:
                    raise DuplicatePaymentForYearError(assignment.member_id, ptype, payment_year)

        # 3. Build MemberPayment lines and compute total
        mp_defs: List[dict] = []   # (member_id, mp_type, price, ptype)
        total_amount = 0.0
        club_fee_created = False
        line_items_for_invoice = []

        for assignment in member_assignments:
            for ptype in assignment.payment_types:
                mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if mp_type is None:
                    continue
                if ptype == "club_fee":
                    if club_fee_created:
                        continue
                    club_fee_created = True

                price = await self._fetch_price(ptype)
                mp_defs.append({
                    "member_id": assignment.member_id,
                    "mp_type": mp_type,
                    "price": price,
                    "ptype": ptype,
                })
                line_items_for_invoice.append({
                    "item_type": ptype,
                    "description": f"{mp_type.value} - {payment_year}",
                    "quantity": 1,
                    "unit_price": price,
                    "total": price,
                })
                total_amount += price

        if include_club_fee and not club_fee_created and member_assignments:
            price = await self._fetch_price("club_fee")
            club_fee_member_id = member_assignments[0].member_id
            mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE["club_fee"]
            mp_defs.append({
                "member_id": club_fee_member_id,
                "mp_type": mp_type,
                "price": price,
                "ptype": "club_fee",
            })
            line_items_for_invoice.append({
                "item_type": "club_fee",
                "description": f"cuota_club - {payment_year}",
                "quantity": 1,
                "unit_price": price,
                "total": price,
            })
            total_amount += price

        # 4. Create parent Payment (status=COMPLETED, method from request)
        parent_payment = Payment(
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_method=PaymentMethod(payment_method),
            amount=total_amount,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            payment_year=payment_year,
            payer_name=payer_name,
            line_items_data=json.dumps(line_items_for_invoice),
            member_assignments=json.dumps([a.to_dict() for a in member_assignments]),
        )
        parent_payment = await self.payment_repository.create(parent_payment)

        # 5. Create MemberPayment lines with real payment_id
        member_payments = [
            MemberPayment(
                payment_id=parent_payment.id,
                member_id=d["member_id"],
                payment_year=payment_year,
                payment_type=d["mp_type"],
                concept=f"{d['mp_type'].value} - {payment_year}",
                amount=d["price"],
                status=MemberPaymentStatus.COMPLETED,
            )
            for d in mp_defs
        ]
        created_member_payments = await self.member_payment_repository.create_bulk(member_payments)

        # 6. Generate Invoice (same path as Redsys webhook)
        invoice = None
        try:
            invoice = await self._create_invoice(parent_payment)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Failed to create invoice for manual payment %s", parent_payment.id
            )

        return RegisterManualPaymentResult(
            payment=parent_payment,
            member_payments=created_member_payments,
            invoice=invoice,
        )

    async def _fetch_price(self, item_type: str) -> float:
        """Fetch price from price_configuration. Returns 0.0 if not found."""
        price_key = PAYMENT_TYPE_TO_PRICE_KEY.get(item_type)
        if not price_key or not self.price_configuration_repository:
            return 0.0
        config = await self.price_configuration_repository.find_by_key(price_key)
        return config.price if config else 0.0

    async def _create_invoice(self, payment: Payment) -> Optional[Invoice]:
        """Create an invoice for the manual payment.

        Mirrors ProcessRedsysWebhookUseCase._create_invoice (lines 202-292).
        Key difference: customer_name = payment.payer_name (always set for manual).
        IMPORTANT: Invoice entity fields are tax_total/total (NOT tax_amount/total_amount).
        """
        if not self.invoice_repository:
            return None

        customer_name = payment.payer_name or ""
        customer_email = None
        # For completeness, try to get email from member if member_id is set
        if self.member_repository and payment.member_id:
            member = await self.member_repository.find_by_id(payment.member_id)
            if member:
                customer_email = member.email

        invoice_year = payment.payment_year or datetime.utcnow().year
        invoice_number = await self.invoice_repository.get_next_invoice_number(invoice_year)
        invoice_settings = get_invoice_settings()

        # Build line items from line_items_data JSON
        line_items: List[InvoiceLineItem] = []
        if payment.line_items_data:
            try:
                items_data = json.loads(payment.line_items_data)
                for item in items_data:
                    line_items.append(InvoiceLineItem(
                        description=item.get("description", ""),
                        quantity=item.get("quantity", 1),
                        unit_price=item.get("unit_price", 0),
                        tax_rate=invoice_settings.tax_rate * 100,
                    ))
            except (json.JSONDecodeError, KeyError):
                line_items = [InvoiceLineItem(
                    description=f"Pago manual - {payment.payment_year}",
                    quantity=1,
                    unit_price=payment.amount,
                    tax_rate=invoice_settings.tax_rate * 100,
                )]
        else:
            line_items = [InvoiceLineItem(
                description=f"Pago manual - {payment.payment_year}",
                quantity=1,
                unit_price=payment.amount,
                tax_rate=invoice_settings.tax_rate * 100,
            )]

        # Construct Invoice using actual entity fields (tax_total/total, NOT tax_amount/total_amount)
        invoice = Invoice(
            invoice_number=invoice_number,
            payment_id=payment.id,
            member_id=payment.member_id or "",
            club_id=payment.club_id,
            customer_name=customer_name,
            customer_email=customer_email or "",
            line_items=line_items,
            status=InvoiceStatus.ISSUED,
            issue_date=datetime.utcnow(),
        )
        invoice.calculate_totals()  # calls _recalculate_totals() to set tax_total and total

        if self.pdf_service:
            try:
                pdf_path = await self.pdf_service.save_invoice_pdf(
                    invoice=invoice,
                    output_dir=invoice_settings.output_dir,
                    company_name=invoice_settings.company_name,
                    company_address=invoice_settings.company_address,
                    company_tax_id=invoice_settings.company_tax_id,
                    logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None,
                )
                invoice.pdf_path = pdf_path
            except Exception:
                pass

        return await self.invoice_repository.create(invoice)
```

---

## 5. New Use Case — `UpdatePaymentUseCase`

**New file:** `backend/src/application/use_cases/payment/update_payment_use_case.py`

```python
"""Update Payment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import (
    PaymentNotFoundError, InvalidPaymentStatusError, InvalidPaymentDataError
)
from src.application.ports.payment_repository import PaymentRepositoryPort


class UpdatePaymentUseCase:
    """Use case for updating a manual payment. Redsys COMPLETED payments are read-only."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        payment_year: Optional[int] = None,
        payment_method: Optional[str] = None,
        payer_name: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Payment:
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)

        # Guard: Redsys COMPLETED is read-only
        if (
            payment.payment_method == PaymentMethod.REDSYS
            and payment.status == PaymentStatus.COMPLETED
        ):
            raise InvalidPaymentStatusError(
                "Los pagos completados por Redsys no son editables"
            )

        if amount is not None:
            if amount < 0:
                raise InvalidPaymentDataError("El importe no puede ser negativo")
            payment.amount = amount
        if payment_year is not None:
            if payment_year < 1900 or payment_year > 2100:
                raise InvalidPaymentDataError("Año de pago fuera de rango")
            payment.payment_year = payment_year
        if payment_method is not None:
            try:
                payment.payment_method = PaymentMethod(payment_method)
            except ValueError:
                raise InvalidPaymentDataError(f"Método de pago inválido: {payment_method}")
        if payer_name is not None:
            payment.payer_name = payer_name
        if status is not None:
            try:
                payment.status = PaymentStatus(status)
            except ValueError:
                raise InvalidPaymentDataError(f"Estado de pago inválido: {status}")

        payment.updated_at = datetime.utcnow()
        return await self.payment_repository.update(payment)
```

---

## 6. New Use Case — `UpdateMemberPaymentUseCase`

**New file:** `backend/src/application/use_cases/payment/update_member_payment_use_case.py`

```python
"""Update MemberPayment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus
from src.domain.entities.payment import PaymentStatus
from src.domain.exceptions.payment import MemberPaymentNotFoundError, InvalidPaymentDataError
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort


class UpdateMemberPaymentUseCase:
    """Use case for editing a MemberPayment line.

    After editing, recomputes parent Payment.amount = sum of COMPLETED lines.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.payment_repository = payment_repository

    async def execute(
        self,
        member_payment_id: str,
        payment_type: Optional[str] = None,
        concept: Optional[str] = None,
        amount: Optional[float] = None,
        status: Optional[str] = None,
    ) -> MemberPayment:
        mp = await self.member_payment_repository.find_by_id(member_payment_id)
        if not mp:
            raise MemberPaymentNotFoundError(member_payment_id)

        if payment_type is not None:
            try:
                mp.payment_type = MemberPaymentType(payment_type)
            except ValueError:
                raise InvalidPaymentDataError(f"Tipo de pago inválido: {payment_type}")
        if concept is not None:
            mp.concept = concept
        if amount is not None:
            if amount < 0:
                raise InvalidPaymentDataError("El importe no puede ser negativo")
            mp.amount = amount
        if status is not None:
            try:
                mp.status = MemberPaymentStatus(status)
            except ValueError:
                raise InvalidPaymentDataError(f"Estado inválido: {status}")

        mp.updated_at = datetime.utcnow()
        updated_mp = await self.member_payment_repository.update(mp)

        # Recompute parent Payment.amount = sum of COMPLETED lines
        await self._recompute_parent_amount(updated_mp.payment_id)

        return updated_mp

    async def _recompute_parent_amount(self, payment_id: str) -> None:
        """Set Payment.amount = sum of all COMPLETED MemberPayment.amount."""
        lines = await self.member_payment_repository.find_by_payment_id(payment_id)
        completed_total = sum(
            mp.amount for mp in lines
            if mp.status == MemberPaymentStatus.COMPLETED
        )
        parent = await self.payment_repository.find_by_id(payment_id)
        if parent:
            parent.amount = completed_total
            parent.updated_at = datetime.utcnow()
            await self.payment_repository.update(parent)
```

---

## 7. New Use Case — `DeleteMemberPaymentUseCase`

**New file:** `backend/src/application/use_cases/payment/delete_member_payment_use_case.py`

```python
"""Delete MemberPayment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.member_payment import MemberPaymentStatus
from src.domain.exceptions.payment import MemberPaymentNotFoundError
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort


class DeleteMemberPaymentUseCase:
    """Use case for deleting a MemberPayment line.

    After deletion, recomputes parent Payment.amount = sum of remaining COMPLETED lines.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.payment_repository = payment_repository

    async def execute(self, member_payment_id: str) -> bool:
        mp = await self.member_payment_repository.find_by_id(member_payment_id)
        if not mp:
            raise MemberPaymentNotFoundError(member_payment_id)

        payment_id = mp.payment_id
        deleted = await self.member_payment_repository.delete(member_payment_id)

        if deleted:
            await self._recompute_parent_amount(payment_id)

        return deleted

    async def _recompute_parent_amount(self, payment_id: str) -> None:
        """Set Payment.amount = sum of all remaining COMPLETED MemberPayment.amount."""
        lines = await self.member_payment_repository.find_by_payment_id(payment_id)
        completed_total = sum(
            mp.amount for mp in lines
            if mp.status == MemberPaymentStatus.COMPLETED
        )
        parent = await self.payment_repository.find_by_id(payment_id)
        if parent:
            parent.amount = completed_total
            parent.updated_at = datetime.utcnow()
            await self.payment_repository.update(parent)
```

---

## 8. Extended `DeletePaymentUseCase` — Cascade

**File:** `backend/src/application/use_cases/payment/delete_payment_use_case.py`

**Replace entire file content:**

```python
"""Delete Payment use case — cascade: MemberPayments → Invoice → Payment."""

import logging
from typing import Optional

from src.domain.entities.payment import PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import PaymentNotFoundError, InvalidPaymentStatusError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort

logger = logging.getLogger(__name__)


class DeletePaymentUseCase:
    """Use case for deleting a payment with cascade.

    Cascade order: MemberPayments → Invoice → Payment.
    Redsys COMPLETED payments require force=True.
    """

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: Optional[MemberPaymentRepositoryPort] = None,
        invoice_repository: Optional[InvoiceRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository

    async def execute(self, payment_id: str, force: bool = False) -> bool:
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)

        # Guard: Redsys COMPLETED requires force=True
        if (
            payment.payment_method == PaymentMethod.REDSYS
            and payment.status == PaymentStatus.COMPLETED
            and not force
        ):
            raise InvalidPaymentStatusError(
                "Los pagos completados por Redsys solo se pueden borrar con force=true"
            )

        # Cascade step 1: delete MemberPayments
        if self.member_payment_repository:
            lines = await self.member_payment_repository.find_by_payment_id(payment_id)
            for mp in lines:
                await self.member_payment_repository.delete(mp.id)
            logger.info("Deleted %d MemberPayments for payment %s", len(lines), payment_id)

        # Cascade step 2: delete Invoice
        if self.invoice_repository:
            try:
                invoice = await self.invoice_repository.find_by_payment_id(payment_id)
                if invoice and invoice.id:
                    await self.invoice_repository.delete(invoice.id)
                    logger.info(
                        "Deleted invoice %s for payment %s", invoice.id, payment_id
                    )
            except Exception:
                # Survive existing Invoice adapter bug (field name mismatch)
                logger.exception(
                    "Could not delete invoice for payment %s (invoice adapter issue)", payment_id
                )

        # Cascade step 3: delete Payment
        deleted = await self.payment_repository.delete(payment_id)
        logger.info("Deleted payment %s (force=%s)", payment_id, force)
        return deleted
```

---

## 9. Auxiliary Use Case — `GetClubMemberPaymentsUseCase`

**New file:** `backend/src/application/use_cases/member_payment/get_club_member_payments_use_case.py`

```python
"""Get all MemberPayments for a club in a given year."""

from typing import List

from src.domain.entities.member_payment import MemberPayment
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


class GetClubMemberPaymentsUseCase:
    """Use case for listing all MemberPayment records for a club by year.

    Because MemberPayment has no club_id, the lookup goes:
    club_id → member_ids (via member_repository) → MemberPayments.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(self, club_id: str, payment_year: int) -> List[MemberPayment]:
        members = await self.member_repository.find_by_club_id(club_id)
        if not members:
            return []
        member_ids = [m.id for m in members if m.id]
        if not member_ids:
            return []
        return await self.member_payment_repository.find_by_member_ids_year(
            member_ids=member_ids,
            payment_year=payment_year,
        )
```

**Pre-condition:** Verify `MemberRepositoryPort` has `find_by_club_id(club_id: str) -> List[Member]`. Run:
```bash
grep -n "def find_by_club_id" backend/src/application/ports/member_repository.py
```

---

## 10. DTOs

### 10.1 New file: `backend/src/infrastructure/web/dto/manual_payment_dto.py`

```python
"""DTOs for manual payment registration and updates."""

from pydantic import BaseModel, field_validator
from typing import Optional, List

from src.infrastructure.web.dto.payment_dto import PaymentResponse


class ManualMemberAssignmentDTO(BaseModel):
    """Assignment of payment types to a member (manual payment)."""
    member_id: str
    member_name: str
    payment_types: List[str]

    @field_validator("member_id")
    @classmethod
    def validate_member_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Member ID is required")
        return v.strip()

    @field_validator("payment_types")
    @classmethod
    def validate_payment_types(cls, v: List[str]) -> List[str]:
        valid_types = {
            "kyu", "kyu_infantil", "dan", "fukushidoin", "shidoin",
            "seguro_accidentes", "seguro_rc", "club_fee",
        }
        for pt in v:
            if pt not in valid_types:
                raise ValueError(f"Invalid payment type: {pt}")
        if not v:
            raise ValueError("At least one payment type required")
        return v


class ManualPaymentRequest(BaseModel):
    """Request DTO for POST /payments/manual."""
    payer_name: str
    club_id: str
    payment_year: int
    payment_method: str          # must be "cash" | "transfer" | "other"
    member_assignments: List[ManualMemberAssignmentDTO]
    include_club_fee: bool = False

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        allowed = {"cash", "transfer", "other"}
        if v not in allowed:
            raise ValueError(f"payment_method must be one of {allowed}")
        return v

    @field_validator("payment_year")
    @classmethod
    def validate_payment_year(cls, v: int) -> int:
        if v < 1900 or v > 2100:
            raise ValueError("payment_year must be between 1900 and 2100")
        return v

    @field_validator("payer_name")
    @classmethod
    def validate_payer_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("payer_name is required")
        return v.strip()

    @field_validator("member_assignments")
    @classmethod
    def validate_member_assignments(cls, v):
        if not v:
            raise ValueError("At least one member assignment is required")
        return v


class PaymentUpdateRequest(BaseModel):
    """Request DTO for PUT /payments/{id}."""
    amount: Optional[float] = None
    payment_year: Optional[int] = None
    payment_method: Optional[str] = None
    payer_name: Optional[str] = None
    status: Optional[str] = None


class ManualPaymentResponse(BaseModel):
    """Response DTO for POST /payments/manual."""
    payment: PaymentResponse
    member_payment_count: int
    invoice_number: Optional[str] = None
```

### 10.2 Extend `backend/src/infrastructure/web/dto/member_payment_dto.py`

**Add at the end of the file:**

```python
class MemberPaymentUpdateRequest(BaseModel):
    """Request DTO for PUT /member-payments/{id}."""
    payment_type: Optional[str] = None
    concept: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
```

---

## 11. Endpoints

### 11.1 `backend/src/infrastructure/web/routers/payments.py` — New + Modified Endpoints

**Add these imports at top of file (after existing imports):**
```python
from src.infrastructure.web.dto.manual_payment_dto import (
    ManualPaymentRequest,
    PaymentUpdateRequest,
    ManualPaymentResponse,
)
from src.infrastructure.web.dependencies import (
    get_register_manual_payment_use_case,
    get_update_payment_use_case,
)
from src.infrastructure.web.authorization import require_super_admin
from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    InvalidPaymentStatusError,
    InvalidPaymentDataError,
    MemberPaymentNotFoundError,
)
from src.application.use_cases.payment.register_manual_payment_use_case import ManualMemberAssignment
```

**New endpoint POST `/payments/manual` — add before the existing DELETE endpoint:**
```python
@router.post("/manual", response_model=ManualPaymentResponse, status_code=status.HTTP_201_CREATED)
async def register_manual_payment(
    request: ManualPaymentRequest,
    use_case=Depends(get_register_manual_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Register a manual payment (cash/transfer/other). Super admin only."""
    require_super_admin(ctx)
    try:
        result = await use_case.execute(
            payer_name=request.payer_name,
            club_id=request.club_id,
            payment_year=request.payment_year,
            payment_method=request.payment_method,
            member_assignments=[
                ManualMemberAssignment(
                    member_id=a.member_id,
                    member_name=a.member_name,
                    payment_types=a.payment_types,
                )
                for a in request.member_assignments
            ],
            include_club_fee=request.include_club_fee,
        )
    except DuplicatePaymentForYearError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ManualPaymentResponse(
        payment=PaymentMapper.to_response_dto(result.payment),
        member_payment_count=len(result.member_payments),
        invoice_number=result.invoice.invoice_number if result.invoice else None,
    )
```

**New endpoint PUT `/payments/{payment_id}` — add before the existing DELETE endpoint:**
```python
@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    request: PaymentUpdateRequest,
    use_case=Depends(get_update_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update a manual payment. Redsys COMPLETED payments are blocked. Super admin only."""
    require_super_admin(ctx)
    try:
        payment = await use_case.execute(
            payment_id=payment_id,
            amount=request.amount,
            payment_year=request.payment_year,
            payment_method=request.payment_method,
            payer_name=request.payer_name,
            status=request.status,
        )
    except PaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentStatusError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return PaymentMapper.to_response_dto(payment)
```

**Modified DELETE `/payments/{payment_id}` — replace existing endpoint (currently lines 280-288):**
```python
@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: str,
    force: bool = False,
    get_delete_use_case=Depends(get_delete_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete payment with cascade (MemberPayments → Invoice → Payment).
    force=true required for Redsys COMPLETED payments. Super admin only."""
    require_super_admin(ctx)
    try:
        await get_delete_use_case.execute(payment_id, force=force)
    except PaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentStatusError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return None
```

**Router ordering matters:** FastAPI matches routes in declaration order. The route `/manual` must be declared before `/{payment_id}` or FastAPI will try to interpret "manual" as a payment_id. Verify the existing `GET /annual/prefill` and `GET /{payment_id}` ordering — the same principle applies to `POST /manual` vs `POST /initiate`. Since `/initiate` already exists and `/{payment_id}` is a GET, the POST `/manual` placement is safe before the DELETE.

### 11.2 `backend/src/infrastructure/web/routers/member_payments.py` — New Endpoints

**Add these imports:**
```python
from datetime import datetime
from src.infrastructure.web.dto.member_payment_dto import MemberPaymentUpdateRequest
from src.infrastructure.web.dependencies import (
    get_update_member_payment_use_case,
    get_delete_member_payment_use_case,
    get_list_club_member_payments_use_case,
)
from src.domain.exceptions.payment import (
    MemberPaymentNotFoundError,
    InvalidPaymentDataError,
)
```

**New endpoint GET `/member-payments/club/{club_id}`:**
```python
@router.get("/club/{club_id}", response_model=List[MemberPaymentResponse])
async def get_club_member_payments(
    club_id: str,
    payment_year: Optional[int] = None,
    use_case=Depends(get_list_club_member_payments_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List all MemberPayments for a club, optionally filtered by year. Super admin only."""
    require_super_admin(ctx)
    year = payment_year or datetime.now().year
    member_payments = await use_case.execute(club_id=club_id, payment_year=year)
    return [
        MemberPaymentResponse(
            id=mp.id,
            payment_id=mp.payment_id,
            member_id=mp.member_id,
            payment_year=mp.payment_year,
            payment_type=mp.payment_type.value,
            concept=mp.concept,
            amount=mp.amount,
            status=mp.status.value,
            created_at=mp.created_at,
            updated_at=mp.updated_at,
        )
        for mp in member_payments
    ]
```

**Note on route ordering:** `GET /club/{club_id}` must be declared BEFORE `GET /member/{member_id}` to prevent route conflicts, but since the prefix segments differ (`club` vs `member`) there is no ambiguity. Similarly, the existing `GET /club/{club_id}/summary` at line 147 and `GET /club/{club_id}/unpaid` at line 199 both have a sub-path — the new `GET /club/{club_id}` (no sub-path) must be placed AFTER those specific sub-paths, or FastAPI may shadow them.

**New endpoint PUT `/member-payments/{member_payment_id}`:**
```python
@router.put("/{member_payment_id}", response_model=MemberPaymentResponse)
async def update_member_payment(
    member_payment_id: str,
    request: MemberPaymentUpdateRequest,
    use_case=Depends(get_update_member_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Edit a MemberPayment line. Parent Payment amount is recomputed. Super admin only."""
    require_super_admin(ctx)
    try:
        mp = await use_case.execute(
            member_payment_id=member_payment_id,
            payment_type=request.payment_type,
            concept=request.concept,
            amount=request.amount,
            status=request.status,
        )
    except MemberPaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentDataError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return MemberPaymentResponse(
        id=mp.id, payment_id=mp.payment_id, member_id=mp.member_id,
        payment_year=mp.payment_year, payment_type=mp.payment_type.value,
        concept=mp.concept, amount=mp.amount, status=mp.status.value,
        created_at=mp.created_at, updated_at=mp.updated_at,
    )
```

**New endpoint DELETE `/member-payments/{member_payment_id}`:**
```python
@router.delete("/{member_payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member_payment(
    member_payment_id: str,
    use_case=Depends(get_delete_member_payment_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete a MemberPayment line. Parent Payment amount is recomputed. Super admin only."""
    require_super_admin(ctx)
    try:
        await use_case.execute(member_payment_id)
    except MemberPaymentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return None
```

---

## 12. Dependency Injection — `backend/src/infrastructure/web/dependencies.py`

### New imports (add after existing use case imports, around line 115):
```python
from src.application.use_cases.payment.register_manual_payment_use_case import RegisterManualPaymentUseCase
from src.application.use_cases.payment.update_payment_use_case import UpdatePaymentUseCase
from src.application.use_cases.payment.update_member_payment_use_case import UpdateMemberPaymentUseCase
from src.application.use_cases.payment.delete_member_payment_use_case import DeleteMemberPaymentUseCase
from src.application.use_cases.member_payment.get_club_member_payments_use_case import GetClubMemberPaymentsUseCase
```

### Replace `get_delete_payment_use_case` (currently lines 399-401):
```python
@lru_cache()
def get_delete_payment_use_case() -> DeletePaymentUseCase:
    """Delete payment use case (cascade: MemberPayments -> Invoice -> Payment)."""
    return DeletePaymentUseCase(
        payment_repository=get_payment_repository(),
        member_payment_repository=get_member_payment_repository(),
        invoice_repository=get_invoice_repository(),
    )
```

### Add after `get_delete_payment_use_case`:
```python
@lru_cache()
def get_register_manual_payment_use_case() -> RegisterManualPaymentUseCase:
    """Register manual payment use case."""
    return RegisterManualPaymentUseCase(
        payment_repository=get_payment_repository(),
        member_payment_repository=get_member_payment_repository(),
        invoice_repository=get_invoice_repository(),
        member_repository=get_member_repository(),
        price_configuration_repository=get_price_configuration_repository(),
        pdf_service=get_pdf_service(),
    )


@lru_cache()
def get_update_payment_use_case() -> UpdatePaymentUseCase:
    """Update payment use case."""
    return UpdatePaymentUseCase(get_payment_repository())


@lru_cache()
def get_update_member_payment_use_case() -> UpdateMemberPaymentUseCase:
    """Update member payment use case."""
    return UpdateMemberPaymentUseCase(
        member_payment_repository=get_member_payment_repository(),
        payment_repository=get_payment_repository(),
    )


@lru_cache()
def get_delete_member_payment_use_case() -> DeleteMemberPaymentUseCase:
    """Delete member payment use case."""
    return DeleteMemberPaymentUseCase(
        member_payment_repository=get_member_payment_repository(),
        payment_repository=get_payment_repository(),
    )


@lru_cache()
def get_list_club_member_payments_use_case() -> GetClubMemberPaymentsUseCase:
    """Get club member payments use case."""
    return GetClubMemberPaymentsUseCase(
        member_payment_repository=get_member_payment_repository(),
        member_repository=get_member_repository(),
    )
```

### Update `backend/src/application/use_cases/__init__.py`

**Add these lines after `DeletePaymentUseCase` export (after line 46):**
```python
from .payment.register_manual_payment_use_case import RegisterManualPaymentUseCase
from .payment.update_payment_use_case import UpdatePaymentUseCase
from .payment.update_member_payment_use_case import UpdateMemberPaymentUseCase
from .payment.delete_member_payment_use_case import DeleteMemberPaymentUseCase
```

**And in `__all__` list, add:**
```python
"RegisterManualPaymentUseCase", "UpdatePaymentUseCase",
"UpdateMemberPaymentUseCase", "DeleteMemberPaymentUseCase",
```

---

## 13. Optional: `delete_by_payment_id` in MemberPaymentRepository

For efficiency in cascade deletes (replaces the loop):

**Port — add abstract method to `backend/src/application/ports/member_payment_repository.py`:**
```python
@abstractmethod
async def delete_by_payment_id(self, payment_id: str) -> int:
    """Delete all member payments linked to a parent payment. Returns count deleted."""
    pass
```

**Adapter — add to `backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py`:**
```python
async def delete_by_payment_id(self, payment_id: str) -> int:
    """Delete all member payments linked to a parent payment."""
    result = await self.collection.delete_many({"payment_id": payment_id})
    return result.deleted_count
```

If added, the `DeletePaymentUseCase` cascade step 1 becomes:
```python
if self.member_payment_repository:
    count = await self.member_payment_repository.delete_by_payment_id(payment_id)
    logger.info("Deleted %d MemberPayments for payment %s", count, payment_id)
```

---

## 14. Test Plan

**Conventions from existing tests:**
- Framework: `pytest` + `pytest-asyncio`
- Markers: `@pytest.mark.unit`, `@pytest.mark.asyncio`
- Mock style: `AsyncMock()` for async repo methods, `MagicMock()` for sync
- Test class structure: `class Test{UseCaseName}:` with method names `async def test_...`
- Fixture pattern: `@pytest.fixture def mock_repos()` returning dict of `AsyncMock`, then `@pytest.fixture def use_case(mock_repos)` constructing the use case

### 14.1 Domain entity tests

**Extend `backend/tests/domain/payment/test_payment_entity.py`:**

```python
def test_payment_method_defaults_to_redsys():
    p = Payment(club_id="c1", payment_type=PaymentType.ANNUAL_QUOTA, amount=100.0)
    assert p.payment_method == PaymentMethod.REDSYS

def test_payment_method_coerces_string_cash():
    p = Payment(club_id="c1", amount=100.0, payment_method="cash")
    assert p.payment_method == PaymentMethod.CASH

def test_payment_method_coerces_string_transfer():
    p = Payment(club_id="c1", amount=100.0, payment_method="transfer")
    assert p.payment_method == PaymentMethod.TRANSFER

def test_payment_method_invalid_raises_invalid_payment_data_error():
    with pytest.raises(InvalidPaymentDataError):
        Payment(club_id="c1", amount=100.0, payment_method="bitcoin")

def test_existing_payment_without_method_gets_redsys_default():
    # Simulates reading old Mongo doc that has no payment_method field
    p = Payment(club_id="c1", amount=100.0)  # payment_method not provided -> default REDSYS
    assert p.payment_method == PaymentMethod.REDSYS
```

### 14.2 `RegisterManualPaymentUseCase` tests

**New file:** `backend/tests/application/use_cases/payment/test_register_manual_payment_use_case.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.application.use_cases.payment.register_manual_payment_use_case import (
    RegisterManualPaymentUseCase, ManualMemberAssignment
)
from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod, PaymentType
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.invoice import Invoice, InvoiceStatus
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError


@pytest.fixture
def mock_repos():
    repos = {
        "payment_repo": AsyncMock(),
        "member_payment_repo": AsyncMock(),
        "invoice_repo": AsyncMock(),
        "member_repo": AsyncMock(),
        "price_config_repo": AsyncMock(),
    }
    # Default setup: no duplicates
    repos["member_payment_repo"].exists_for_member_year_type = AsyncMock(return_value=False)
    # create returns the same payment with an id
    created_payment = Payment(
        id="pay123", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA,
        payment_method=PaymentMethod.CASH, amount=100.0,
        status=PaymentStatus.COMPLETED, payment_year=2026
    )
    repos["payment_repo"].create = AsyncMock(return_value=created_payment)
    repos["member_payment_repo"].create_bulk = AsyncMock(return_value=[])
    repos["invoice_repo"].get_next_invoice_number = AsyncMock(return_value="2026-000001")
    repos["invoice_repo"].create = AsyncMock(
        return_value=Invoice(
            invoice_number="2026-000001", payment_id="pay123",
            member_id="", status=InvoiceStatus.ISSUED
        )
    )
    # price config returns a price config with price=50.0
    mock_price = MagicMock()
    mock_price.price = 50.0
    repos["price_config_repo"].find_by_key = AsyncMock(return_value=mock_price)
    return repos


@pytest.fixture
def use_case(mock_repos):
    return RegisterManualPaymentUseCase(
        payment_repository=mock_repos["payment_repo"],
        member_payment_repository=mock_repos["member_payment_repo"],
        invoice_repository=mock_repos["invoice_repo"],
        member_repository=mock_repos["member_repo"],
        price_configuration_repository=mock_repos["price_config_repo"],
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestRegisterManualPaymentUseCase:

    async def test_creates_parent_payment_with_completed_status(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Test Admin", club_id="club1", payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["payment_repo"].create.assert_called_once()
        call_arg: Payment = mock_repos["payment_repo"].create.call_args[0][0]
        assert call_arg.status == PaymentStatus.COMPLETED
        assert call_arg.payment_method == PaymentMethod.CASH

    async def test_creates_member_payments_with_correct_payment_id(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Admin", club_id="club1", payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["member_payment_repo"].create_bulk.assert_called_once()
        mps = mock_repos["member_payment_repo"].create_bulk.call_args[0][0]
        assert all(mp.payment_id == "pay123" for mp in mps)

    async def test_raises_duplicate_if_member_type_year_already_paid(self, use_case, mock_repos):
        mock_repos["member_payment_repo"].exists_for_member_year_type = AsyncMock(return_value=True)
        with pytest.raises(DuplicatePaymentForYearError):
            await use_case.execute(
                payer_name="Admin", club_id="club1", payment_year=2026,
                payment_method="cash",
                member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
            )
        mock_repos["payment_repo"].create.assert_not_called()

    async def test_raises_on_empty_member_assignments(self, use_case, mock_repos):
        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute(
                payer_name="Admin", club_id="club1", payment_year=2026,
                payment_method="cash", member_assignments=[],
            )

    async def test_total_amount_equals_sum_of_line_prices(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Admin", club_id="club1", payment_year=2026,
            payment_method="cash",
            member_assignments=[
                ManualMemberAssignment("m1", "M One", ["kyu", "seguro_accidentes"]),
            ],
        )
        call_arg: Payment = mock_repos["payment_repo"].create.call_args[0][0]
        assert call_arg.amount == 100.0  # 2 x 50.0

    async def test_creates_invoice_after_payment(self, use_case, mock_repos):
        result = await use_case.execute(
            payer_name="Admin", club_id="club1", payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["invoice_repo"].create.assert_called_once()
        assert result.invoice is not None
        assert result.invoice.invoice_number == "2026-000001"
```

### 14.3 `UpdatePaymentUseCase` tests

**New file:** `backend/tests/application/use_cases/payment/test_update_payment_use_case.py`

```python
@pytest.mark.unit
@pytest.mark.asyncio
class TestUpdatePaymentUseCase:

    async def test_updates_manual_completed_payment(self, use_case, mock_repos):
        # find_by_id returns CASH/COMPLETED payment
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=Payment(
            id="p1", club_id="c1", amount=100.0,
            status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.CASH,
            payment_year=2025
        ))
        mock_repos["payment_repo"].update = AsyncMock(return_value=...)
        await use_case.execute("p1", amount=150.0, payer_name="New Name")
        mock_repos["payment_repo"].update.assert_called_once()

    async def test_raises_for_redsys_completed(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=Payment(
            id="p1", club_id="c1", amount=100.0,
            status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.REDSYS
        ))
        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("p1", amount=200.0)
        mock_repos["payment_repo"].update.assert_not_called()

    async def test_raises_for_nonexistent_payment(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)
        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("does_not_exist", amount=50.0)
```

### 14.4 `UpdateMemberPaymentUseCase` tests

**New file:** `backend/tests/application/use_cases/payment/test_update_member_payment_use_case.py`

```python
@pytest.mark.unit
@pytest.mark.asyncio
class TestUpdateMemberPaymentUseCase:

    async def test_recomputes_parent_amount_from_completed_lines_only(self, use_case, mock_repos):
        # find_by_payment_id returns 2 COMPLETED + 1 REFUNDED line
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=_make_mp("mp1", "pay1", 50.0))
        mock_repos["mp_repo"].update = AsyncMock(return_value=_make_mp("mp1", "pay1", 75.0))
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[
            _make_mp("mp1", "pay1", 75.0, status=MemberPaymentStatus.COMPLETED),
            _make_mp("mp2", "pay1", 30.0, status=MemberPaymentStatus.COMPLETED),
            _make_mp("mp3", "pay1", 20.0, status=MemberPaymentStatus.REFUNDED),
        ])
        parent = Payment(id="pay1", club_id="c1", amount=100.0, payment_year=2026)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", amount=75.0)

        update_call_arg = mock_repos["payment_repo"].update.call_args[0][0]
        assert update_call_arg.amount == 105.0  # 75 + 30 only (REFUNDED excluded)

    async def test_raises_for_not_found(self, use_case, mock_repos):
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)
        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("does_not_exist", amount=50.0)
```

### 14.5 `DeletePaymentUseCase` cascade tests

**New file:** `backend/tests/application/use_cases/payment/test_delete_payment_use_case_cascade.py`

```python
@pytest.mark.unit
@pytest.mark.asyncio
class TestDeletePaymentUseCaseCascade:

    async def test_cascade_deletes_in_correct_order(self, use_case, mock_repos):
        # mp_repo.find_by_payment_id → [mp1, mp2]
        # invoice_repo.find_by_payment_id → invoice
        # Verify: mp1.delete, mp2.delete, invoice.delete, payment.delete all called
        ...

    async def test_redsys_completed_without_force_raises(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=Payment(
            id="p1", club_id="c1", amount=100.0,
            status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.REDSYS
        ))
        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("p1", force=False)
        mock_repos["payment_repo"].delete.assert_not_called()

    async def test_redsys_completed_with_force_proceeds(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=Payment(
            id="p1", club_id="c1", amount=100.0,
            status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.REDSYS
        ))
        mock_repos["payment_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)
        await use_case.execute("p1", force=True)
        mock_repos["payment_repo"].delete.assert_called_once_with("p1")

    async def test_manual_completed_without_force_succeeds(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=Payment(
            id="p1", club_id="c1", amount=100.0,
            status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.CASH
        ))
        mock_repos["payment_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)
        result = await use_case.execute("p1", force=False)  # no exception
        assert result is True

    async def test_not_found_raises(self, use_case, mock_repos):
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)
        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("nonexistent")
```

### 14.6 `DeleteMemberPaymentUseCase` tests

**New file:** `backend/tests/application/use_cases/payment/test_delete_member_payment_use_case.py`

```python
@pytest.mark.unit
@pytest.mark.asyncio
class TestDeleteMemberPaymentUseCase:

    async def test_delete_recomputes_parent_amount(self, use_case, mock_repos):
        ...  # verify payment_repo.update called with recomputed amount

    async def test_not_found_raises(self, use_case, mock_repos):
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)
        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("nonexistent")
```

---

## 15. Risks and Missing Pieces — Summary Table

| # | Risk | Severity | Action |
|---|------|----------|--------|
| 1 | `invoice.calculate_totals()` doesn't exist | BLOCKING | Add public method to `Invoice` entity before implementing manual payment |
| 2 | Invoice adapter fields `tax_amount`/`total_amount`/`paid_date`/`license_id` don't match entity | HIGH — existing bug | Don't replicate; wrap `find_by_payment_id` in try/except in cascade delete |
| 3 | `MemberPayment.__post_init__` rejects empty `payment_id` | HIGH | Create parent Payment first, get real `id`, then construct `MemberPayment` objects |
| 4 | `MemberPaymentNotFoundError` not yet in exceptions | MEDIUM | Add to `payment.py` exceptions (Section 3) |
| 5 | `member_repository.find_by_club_id` must exist | MEDIUM | Verify with grep before implementing `GetClubMemberPaymentsUseCase` |
| 6 | FastAPI route ordering — `/manual` vs `/{payment_id}` | MEDIUM | POST `/manual` is safe (different HTTP method from GET `/{payment_id}`), but verify |
| 7 | `GET /club/{club_id}` in member_payments conflicts with existing `/club/{club_id}/summary` and `/club/{club_id}/unpaid` | MEDIUM | Declare specific paths (`/summary`, `/unpaid`) BEFORE the bare `/club/{club_id}` route |
| 8 | `delete_by_payment_id` absent from MemberPaymentRepositoryPort | LOW | Optional optimization; loop-based cascade is correct |
| 9 | `lru_cache` on `get_delete_payment_use_case` — function signature changes | LOW | Works correctly, cached instance includes cascade repos |

---

## 16. All Files to Create or Modify

| Action | File |
|--------|------|
| MODIFY | `backend/src/domain/entities/payment.py` — add `PaymentMethod` enum + field + `__post_init__` coercion |
| MODIFY | `backend/src/domain/entities/invoice.py` — add public `calculate_totals()` method |
| MODIFY | `backend/src/domain/exceptions/payment.py` — add `MemberPaymentNotFoundError` |
| MODIFY | `backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py` — `_to_domain` + `_to_document` for `payment_method` |
| MODIFY | `backend/src/infrastructure/web/dto/payment_dto.py` — add `payment_method` to `PaymentResponse` |
| MODIFY | `backend/src/infrastructure/web/mappers_payment.py` — add `payment_method` to `to_response_dto` |
| MODIFY | `backend/src/infrastructure/web/routers/payments.py` — add POST `/manual`, PUT `/{id}`, extend DELETE `/{id}` with `force` param + `require_super_admin` |
| MODIFY | `backend/src/infrastructure/web/routers/member_payments.py` — add GET `/club/{id}`, PUT `/{id}`, DELETE `/{id}` |
| MODIFY | `backend/src/application/use_cases/payment/delete_payment_use_case.py` — full rewrite with cascade |
| MODIFY | `backend/src/infrastructure/web/dependencies.py` — replace `get_delete_payment_use_case` + add 5 new DI functions |
| MODIFY | `backend/src/application/use_cases/__init__.py` — add 4 new use case exports |
| MODIFY | `backend/src/infrastructure/web/dto/member_payment_dto.py` — add `MemberPaymentUpdateRequest` |
| CREATE | `backend/src/infrastructure/web/dto/manual_payment_dto.py` |
| CREATE | `backend/src/application/use_cases/payment/register_manual_payment_use_case.py` |
| CREATE | `backend/src/application/use_cases/payment/update_payment_use_case.py` |
| CREATE | `backend/src/application/use_cases/payment/update_member_payment_use_case.py` |
| CREATE | `backend/src/application/use_cases/payment/delete_member_payment_use_case.py` |
| CREATE | `backend/src/application/use_cases/member_payment/get_club_member_payments_use_case.py` |
| CREATE | `backend/tests/application/use_cases/payment/test_register_manual_payment_use_case.py` |
| CREATE | `backend/tests/application/use_cases/payment/test_update_payment_use_case.py` |
| CREATE | `backend/tests/application/use_cases/payment/test_update_member_payment_use_case.py` |
| CREATE | `backend/tests/application/use_cases/payment/test_delete_payment_use_case_cascade.py` |
| CREATE | `backend/tests/application/use_cases/payment/test_delete_member_payment_use_case.py` |
| OPTIONAL | `backend/src/application/ports/member_payment_repository.py` — add `delete_by_payment_id` |
| OPTIONAL | `backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py` — implement `delete_by_payment_id` |
