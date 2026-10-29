"""Get Member Payment History use case."""

import asyncio
from dataclasses import dataclass
from typing import Dict, List

from src.domain.entities.member_payment import MemberPayment
from src.domain.entities.payment import Payment, PaymentStatus
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort


@dataclass
class MemberPaymentHistoryResult:
    """Result containing member's payment history."""
    member_id: str
    member_name: str
    payments: List[MemberPayment]
    total_count: int
    payment_by_id: Dict[str, Payment]


class GetMemberPaymentHistoryUseCase:
    """Use case for getting member's complete payment history."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository
        self.payment_repository = payment_repository

    async def execute(
        self,
        member_id: str,
        limit: int = 0
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

        payment_ids = list({p.payment_id for p in payments if p.payment_id})
        found = await asyncio.gather(*(self.payment_repository.find_by_id(pid) for pid in payment_ids))
        payment_by_id: Dict[str, Payment] = {
            pid: payment
            for pid, payment in zip(payment_ids, found)
            if payment and payment.status == PaymentStatus.COMPLETED
        }

        return MemberPaymentHistoryResult(
            member_id=member_id,
            member_name=member_name,
            payments=payments,
            total_count=len(payments),
            payment_by_id=payment_by_id,
        )
