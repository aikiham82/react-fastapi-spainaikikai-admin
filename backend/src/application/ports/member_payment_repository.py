"""Repository port interface for MemberPayment domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus


class MemberPaymentRepositoryPort(ABC):
    """Port for member payment repository operations.

    Note: club_id has been removed from MemberPayment entity.
    Methods that need club-level filtering now take member_ids instead.
    """

    @abstractmethod
    async def create(self, member_payment: MemberPayment) -> MemberPayment:
        """Create a new member payment record."""
        pass

    @abstractmethod
    async def create_bulk(self, payments: List[MemberPayment]) -> List[MemberPayment]:
        """Create multiple member payment records in bulk."""
        pass

    @abstractmethod
    async def find_by_id(self, member_payment_id: str) -> Optional[MemberPayment]:
        """Find a member payment by ID."""
        pass

    @abstractmethod
    async def find_by_member_id(
        self,
        member_id: str,
        limit: int = 0
    ) -> List[MemberPayment]:
        """Find all payments for a specific member."""
        pass

    @abstractmethod
    async def find_by_member_year(
        self,
        member_id: str,
        payment_year: int
    ) -> List[MemberPayment]:
        """Find all payments for a member in a specific year."""
        pass

    @abstractmethod
    async def find_by_member_ids_year(
        self,
        member_ids: List[str],
        payment_year: int,
        status: Optional[MemberPaymentStatus] = None,
        limit: int = 0
    ) -> List[MemberPayment]:
        """Find all member payments for a list of members in a specific year."""
        pass

    @abstractmethod
    async def find_by_payment_id(self, payment_id: str) -> List[MemberPayment]:
        """Find all member payments linked to a parent payment."""
        pass

    @abstractmethod
    async def update(self, member_payment: MemberPayment) -> MemberPayment:
        """Update a member payment record."""
        pass

    @abstractmethod
    async def update_status_by_payment_id(
        self,
        payment_id: str,
        status: MemberPaymentStatus
    ) -> int:
        """
        Update status for all member payments linked to a parent payment.

        Returns the number of records updated.
        """
        pass

    @abstractmethod
    async def delete(self, member_payment_id: str) -> bool:
        """Delete a member payment record."""
        pass

    @abstractmethod
    async def get_summary_by_member_ids(
        self,
        member_ids: List[str],
        payment_year: int
    ) -> dict:
        """
        Get payment summary for a list of members in a specific year.

        Returns dict with counts and totals per payment type.
        """
        pass

    @abstractmethod
    async def exists_for_member_year_type(
        self,
        member_id: str,
        payment_year: int,
        payment_type: MemberPaymentType
    ) -> bool:
        """Check if a payment already exists for member, year, and type."""
        pass
