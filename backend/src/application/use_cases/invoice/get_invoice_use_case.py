"""Get Invoice use case."""

from src.domain.entities.invoice import Invoice
from src.domain.exceptions.invoice import InvoiceNotFoundError
from src.application.ports.invoice_repository import InvoiceRepositoryPort


class GetInvoiceUseCase:
    """Use case for getting an invoice by ID."""

    def __init__(self, invoice_repository: InvoiceRepositoryPort):
        self.invoice_repository = invoice_repository

    async def execute(self, invoice_id: str) -> Invoice:
        """Execute the use case."""
        invoice = await self.invoice_repository.find_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundError(invoice_id)
        return invoice
