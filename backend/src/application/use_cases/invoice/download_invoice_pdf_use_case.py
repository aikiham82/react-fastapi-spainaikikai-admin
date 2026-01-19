"""Download Invoice PDF use case."""

import os
from dataclasses import dataclass

from src.domain.entities.invoice import Invoice
from src.domain.exceptions.invoice import InvoiceNotFoundError, InvoicePDFGenerationError
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.config.settings import get_invoice_settings


@dataclass
class InvoicePDFResult:
    """Result of downloading an invoice PDF."""
    pdf_bytes: bytes
    filename: str
    content_type: str = "application/pdf"


class DownloadInvoicePDFUseCase:
    """Use case for downloading an invoice PDF."""

    def __init__(
        self,
        invoice_repository: InvoiceRepositoryPort,
        pdf_service: PDFServicePort
    ):
        self.invoice_repository = invoice_repository
        self.pdf_service = pdf_service

    async def execute(self, invoice_id: str) -> InvoicePDFResult:
        """Execute the use case."""
        invoice = await self.invoice_repository.find_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundError(invoice_id)

        # Check if PDF already exists
        if invoice.pdf_path and os.path.exists(invoice.pdf_path):
            with open(invoice.pdf_path, "rb") as f:
                pdf_bytes = f.read()
        else:
            # Generate PDF on-the-fly
            invoice_settings = get_invoice_settings()
            try:
                pdf_bytes = await self.pdf_service.generate_invoice_pdf(
                    invoice=invoice,
                    company_name=invoice_settings.company_name,
                    company_address=invoice_settings.company_address,
                    company_tax_id=invoice_settings.company_tax_id,
                    logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None
                )
            except Exception as e:
                raise InvoicePDFGenerationError(
                    invoice_number=invoice.invoice_number,
                    reason=str(e)
                )

        filename = f"factura_{invoice.invoice_number.replace('/', '-')}.pdf"

        return InvoicePDFResult(
            pdf_bytes=pdf_bytes,
            filename=filename
        )
