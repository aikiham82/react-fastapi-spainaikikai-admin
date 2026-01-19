"""Application settings and configuration for payment gateway integration."""

import os
from typing import Literal, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class RedsysSettings:
    """Redsys payment gateway settings."""

    merchant_code: str = ""
    terminal: str = "1"
    secret_key: str = ""
    environment: Literal["test", "production"] = "test"
    currency: str = "978"  # 978 = EUR
    signature_version: str = "HMAC_SHA256_V1"

    def __post_init__(self):
        """Load settings from environment variables."""
        self.merchant_code = os.getenv("REDSYS_MERCHANT_CODE", self.merchant_code)
        self.terminal = os.getenv("REDSYS_TERMINAL", self.terminal)
        self.secret_key = os.getenv("REDSYS_SECRET_KEY", self.secret_key)
        self.environment = os.getenv("REDSYS_ENVIRONMENT", self.environment)
        self.currency = os.getenv("REDSYS_CURRENCY", self.currency)

    @property
    def payment_url(self) -> str:
        """Get Redsys payment URL based on environment."""
        if self.environment == "production":
            return "https://sis.redsys.es/sis/realizarPago"
        return "https://sis-t.redsys.es:25443/sis/realizarPago"

    def validate(self) -> None:
        """Validate required settings.

        Raises:
            ValueError: If required settings are missing.
        """
        if not self.merchant_code:
            raise ValueError("REDSYS_MERCHANT_CODE is required")
        if not self.secret_key:
            raise ValueError("REDSYS_SECRET_KEY is required")


@dataclass
class EmailSettings:
    """Email notification settings using OVH SMTP."""

    # OVH SMTP settings
    smtp_host: str = "ssl0.ovh.net"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_ssl: bool = True

    # Common settings
    from_email: str = ""
    from_name: str = "Spain Aikikai"

    def __post_init__(self):
        """Load settings from environment variables."""
        self.smtp_host = os.getenv("SMTP_HOST", self.smtp_host)
        self.smtp_port = int(os.getenv("SMTP_PORT", str(self.smtp_port)))
        self.smtp_user = os.getenv("SMTP_USER", self.smtp_user)
        self.smtp_password = os.getenv("SMTP_PASSWORD", self.smtp_password)
        self.smtp_use_ssl = os.getenv("SMTP_USE_SSL", "true").lower() == "true"
        self.from_email = os.getenv("EMAIL_FROM_ADDRESS", self.from_email)
        self.from_name = os.getenv("EMAIL_FROM_NAME", self.from_name)

    def validate(self) -> None:
        """Validate required settings.

        Raises:
            ValueError: If required settings are missing.
        """
        if not self.from_email:
            raise ValueError("EMAIL_FROM_ADDRESS is required")
        if not self.smtp_password:
            raise ValueError("SMTP_PASSWORD is required")

    @property
    def is_configured(self) -> bool:
        """Check if SMTP settings are configured."""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)


@dataclass
class InvoiceSettings:
    """Invoice generation settings."""

    company_name: str = ""
    company_address: str = ""
    company_tax_id: str = ""
    logo_path: Optional[str] = None
    tax_rate: float = 0.0  # Default 0% for federation licenses
    output_directory: str = "invoices"

    def __post_init__(self):
        """Load settings from environment variables."""
        self.company_name = os.getenv("INVOICE_COMPANY_NAME", self.company_name)
        self.company_address = os.getenv("INVOICE_COMPANY_ADDRESS", self.company_address)
        self.company_tax_id = os.getenv("INVOICE_COMPANY_TAX_ID", self.company_tax_id)
        self.logo_path = os.getenv("INVOICE_LOGO_PATH", self.logo_path)
        self.tax_rate = float(os.getenv("INVOICE_TAX_RATE", str(self.tax_rate)))
        self.output_directory = os.getenv("INVOICE_OUTPUT_DIR", self.output_directory)

    def validate(self) -> None:
        """Validate required settings.

        Raises:
            ValueError: If required settings are missing.
        """
        if not self.company_name:
            raise ValueError("INVOICE_COMPANY_NAME is required")

    # Alias for service compatibility
    @property
    def output_dir(self) -> str:
        return self.output_directory


@dataclass
class AppSettings:
    """Application-wide settings."""

    frontend_base_url: str = "http://localhost:5173"
    backend_base_url: str = "http://localhost:8000"
    environment: str = "development"

    def __post_init__(self):
        """Load settings from environment variables."""
        self.frontend_base_url = os.getenv("FRONTEND_BASE_URL", self.frontend_base_url)
        self.backend_base_url = os.getenv("BACKEND_BASE_URL", self.backend_base_url)
        self.environment = os.getenv("ENVIRONMENT", self.environment)

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"


# Global settings instances - initialized lazily
_redsys_settings: Optional[RedsysSettings] = None
_email_settings: Optional[EmailSettings] = None
_invoice_settings: Optional[InvoiceSettings] = None
_app_settings: Optional[AppSettings] = None


def get_redsys_settings() -> RedsysSettings:
    """Get Redsys settings instance."""
    global _redsys_settings
    if _redsys_settings is None:
        _redsys_settings = RedsysSettings()
    return _redsys_settings


def get_email_settings() -> EmailSettings:
    """Get email settings instance."""
    global _email_settings
    if _email_settings is None:
        _email_settings = EmailSettings()
    return _email_settings


def get_invoice_settings() -> InvoiceSettings:
    """Get invoice settings instance."""
    global _invoice_settings
    if _invoice_settings is None:
        _invoice_settings = InvoiceSettings()
    return _invoice_settings


def get_app_settings() -> AppSettings:
    """Get app settings instance."""
    global _app_settings
    if _app_settings is None:
        _app_settings = AppSettings()
    return _app_settings
