"""Service port interfaces for PDF generation operations."""

from abc import ABC, abstractmethod
from typing import Optional

from src.domain.entities.invoice import Invoice


class PDFServicePort(ABC):
    """Port for PDF generation service operations."""

    @abstractmethod
    async def generate_invoice_pdf(
        self,
        invoice: Invoice,
        company_name: str,
        company_address: str,
        company_tax_id: str,
        logo_path: Optional[str] = None
    ) -> bytes:
        """Generate a PDF for an invoice and return the bytes."""
        pass

    @abstractmethod
    async def save_invoice_pdf(
        self,
        invoice: Invoice,
        output_dir: str,
        company_name: str,
        company_address: str,
        company_tax_id: str,
        logo_path: Optional[str] = None
    ) -> str:
        """Generate and save an invoice PDF, returning the file path."""
        pass

    @abstractmethod
    async def generate_license_certificate_pdf(
        self,
        member_name: str,
        license_number: str,
        license_type: str,
        issue_date: str,
        expiration_date: str,
        club_name: str
    ) -> bytes:
        """Generate a license certificate PDF."""
        pass
