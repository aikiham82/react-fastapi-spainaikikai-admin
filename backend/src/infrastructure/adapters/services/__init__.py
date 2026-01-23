# Service adapters - External service implementations

from .redsys_service import RedsysService
from .email_service import EmailService
from .pdf_service import PDFService
from .license_image_service import LicenseImageService

__all__ = [
    "RedsysService",
    "EmailService",
    "PDFService",
    "LicenseImageService"
]
