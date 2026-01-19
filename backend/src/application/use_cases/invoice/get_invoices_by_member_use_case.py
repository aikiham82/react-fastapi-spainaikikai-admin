"""Get Invoices by Member use case."""

from typing import List

from src.domain.entities.invoice import Invoice
from src.application.ports.invoice_repository import InvoiceRepositoryPort


class GetInvoicesByMemberUseCase:
    """Use case for getting all invoices for a member."""

    def __init__(self, invoice_repository: InvoiceRepositoryPort):
        self.invoice_repository = invoice_repository

    async def execute(self, member_id: str, limit: int = 100) -> List[Invoice]:
        """Execute the use case."""
        return await self.invoice_repository.find_by_member_id(member_id, limit)
