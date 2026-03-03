"""Repository port interfaces for Invoice domain."""

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date

from src.domain.entities.invoice import Invoice, InvoiceStatus


class InvoiceRepositoryPort(ABC):
    """Port for invoice repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 0) -> List[Invoice]:
        """Find all invoices."""
        pass

    @abstractmethod
    async def find_by_id(self, invoice_id: str) -> Optional[Invoice]:
        """Find an invoice by ID."""
        pass

    @abstractmethod
    async def find_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        """Find an invoice by invoice number."""
        pass

    @abstractmethod
    async def find_by_payment_id(self, payment_id: str) -> Optional[Invoice]:
        """Find an invoice by payment ID."""
        pass

    @abstractmethod
    async def find_by_member_id(self, member_id: str, limit: int = 0) -> List[Invoice]:
        """Find invoices by member ID."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 0) -> List[Invoice]:
        """Find invoices by club ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: InvoiceStatus, limit: int = 0) -> List[Invoice]:
        """Find invoices by status."""
        pass

    @abstractmethod
    async def find_by_date_range(
        self,
        start_date: Optional[date],
        end_date: Optional[date],
        limit: int = 0
    ) -> List[Invoice]:
        """Find invoices within a date range."""
        pass

    @abstractmethod
    async def get_next_invoice_number(self, year: int) -> str:
        """Get the next sequential invoice number for a given year."""
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
        """Delete an invoice by ID."""
        pass

    @abstractmethod
    async def exists(self, invoice_id: str) -> bool:
        """Check if an invoice exists."""
        pass

    @abstractmethod
    async def exists_by_invoice_number(self, invoice_number: str) -> bool:
        """Check if an invoice exists by invoice number."""
        pass
