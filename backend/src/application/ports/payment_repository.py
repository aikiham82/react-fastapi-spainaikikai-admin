"""Repository port interfaces for Payment domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType


class PaymentRepositoryPort(ABC):
    """Port for payment repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Payment]:
        """Find all payments."""
        pass

    @abstractmethod
    async def find_by_id(self, payment_id: str) -> Optional[Payment]:
        """Find a payment by ID."""
        pass

    @abstractmethod
    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[Payment]:
        """Find payments by member ID."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Payment]:
        """Find payments by club ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: PaymentStatus, limit: int = 100) -> List[Payment]:
        """Find payments by status."""
        pass

    @abstractmethod
    async def find_by_type(self, payment_type: PaymentType, limit: int = 100) -> List[Payment]:
        """Find payments by type."""
        pass

    @abstractmethod
    async def find_by_transaction_id(self, transaction_id: str) -> Optional[Payment]:
        """Find a payment by transaction ID."""
        pass

    @abstractmethod
    async def find_by_date_range(
        self,
        start_date: Optional[str],
        end_date: Optional[str],
        limit: int = 100
    ) -> List[Payment]:
        """Find payments within a date range."""
        pass

    @abstractmethod
    async def create(self, payment: Payment) -> Payment:
        """Create a new payment."""
        pass

    @abstractmethod
    async def update(self, payment: Payment) -> Payment:
        """Update an existing payment."""
        pass

    @abstractmethod
    async def delete(self, payment_id: str) -> bool:
        """Delete a payment by ID."""
        pass

    @abstractmethod
    async def exists(self, payment_id: str) -> bool:
        """Check if a payment exists."""
        pass
