"""Get Member Payment History use case."""

from dataclasses import dataclass
from typing import List, Optional

from src.domain.entities.member_payment import MemberPayment
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class MemberPaymentHistoryResult:
    """Result containing member's payment history."""
    member_id: str
    member_name: str
    payments: List[MemberPayment]
    total_count: int


class GetMemberPaymentHistoryUseCase:
    """Use case for getting member's complete payment history."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(
        self,
        member_id: str,
        limit: int = 100
    ) -> MemberPaymentHistoryResult:
        """
        Get payment history for a member.

        Args:
            member_id: The member ID to get history for.
            limit: Maximum number of payments to return.

        Returns:
            MemberPaymentHistoryResult with payment list.
        """
        # Get member info
        member = await self.member_repository.find_by_id(member_id)
        if not member:
            raise ValueError(f"Member with ID {member_id} not found")

        member_name = member.get_full_name()

        # Get all payments for the member
        payments = await self.member_payment_repository.find_by_member_id(
            member_id=member_id,
            limit=limit
        )

        return MemberPaymentHistoryResult(
            member_id=member_id,
            member_name=member_name,
            payments=payments,
            total_count=len(payments)
        )
