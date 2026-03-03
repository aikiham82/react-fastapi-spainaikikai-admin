"""Get All Invoices use case."""

from typing import List, Optional
from datetime import date

from src.domain.entities.invoice import Invoice, InvoiceStatus
from src.application.ports.invoice_repository import InvoiceRepositoryPort


class GetAllInvoicesUseCase:
    """Use case for getting all invoices with optional filters."""

    def __init__(self, invoice_repository: InvoiceRepositoryPort):
        self.invoice_repository = invoice_repository

    async def execute(
        self,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 0
    ) -> List[Invoice]:
        """Execute the use case."""
        if status:
            return await self.invoice_repository.find_by_status(
                InvoiceStatus(status),
                limit
            )
        elif start_date or end_date:
            return await self.invoice_repository.find_by_date_range(
                start_date,
                end_date,
                limit
            )
        return await self.invoice_repository.find_all(limit)
