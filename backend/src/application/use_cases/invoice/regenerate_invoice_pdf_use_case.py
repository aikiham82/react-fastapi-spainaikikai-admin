"""Regenerate Invoice PDF use case."""

from src.domain.entities.invoice import Invoice
from src.domain.exceptions.invoice import InvoiceNotFoundError, InvoicePDFGenerationError
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.config.settings import get_invoice_settings


class RegenerateInvoicePDFUseCase:
    """Use case for regenerating an invoice PDF."""

    def __init__(
        self,
        invoice_repository: InvoiceRepositoryPort,
        pdf_service: PDFServicePort
    ):
        self.invoice_repository = invoice_repository
        self.pdf_service = pdf_service

    async def execute(self, invoice_id: str) -> Invoice:
        """Execute the use case."""
        invoice = await self.invoice_repository.find_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundError(invoice_id)

        invoice_settings = get_invoice_settings()

        try:
            pdf_path = await self.pdf_service.save_invoice_pdf(
                invoice=invoice,
                output_dir=invoice_settings.output_dir,
                company_name=invoice_settings.company_name,
                company_address=invoice_settings.company_address,
                company_tax_id=invoice_settings.company_tax_id,
                logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None
            )
            invoice.pdf_path = pdf_path
        except Exception as e:
            raise InvoicePDFGenerationError(
                invoice_number=invoice.invoice_number,
                reason=str(e)
            )

        return await self.invoice_repository.update(invoice)
