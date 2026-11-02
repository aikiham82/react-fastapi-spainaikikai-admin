"""Delete MemberPayment use case."""

from datetime import datetime

from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus
from src.domain.exceptions.payment import MemberPaymentNotFoundError
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort


class DeleteMemberPaymentUseCase:
    """Use case for deleting a MemberPayment line.

    After deletion, recomputes parent Payment.amount = sum of remaining COMPLETED lines.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.payment_repository = payment_repository

    async def execute(self, member_payment_id: str) -> bool:
        mp = await self.member_payment_repository.find_by_id(member_payment_id)
        if not mp:
            raise MemberPaymentNotFoundError(member_payment_id)

        payment_id = mp.payment_id
        await self._ensure_parent_covers_refund(mp)
        deleted = await self.member_payment_repository.delete(member_payment_id)

        if deleted:
            await self._recompute_parent_amount(payment_id)

        return deleted

    async def _ensure_parent_covers_refund(self, deleted: MemberPayment) -> None:
        parent = await self.payment_repository.find_by_id(deleted.payment_id)
        if not parent or not parent.refund_amount:
            return
        lines = await self.member_payment_repository.find_by_payment_id(deleted.payment_id)
        parent.ensure_covers_refund(
            sum(
                line.amount for line in lines
                if line.id != deleted.id and line.status == MemberPaymentStatus.COMPLETED
            )
        )

    async def _recompute_parent_amount(self, payment_id: str) -> None:
        """Set Payment.amount = sum of all remaining COMPLETED MemberPayment.amount."""
        lines = await self.member_payment_repository.find_by_payment_id(payment_id)
        completed_total = sum(
            mp.amount for mp in lines
            if mp.status == MemberPaymentStatus.COMPLETED
        )
        parent = await self.payment_repository.find_by_id(payment_id)
        if parent:
            parent.amount = completed_total
            parent.updated_at = datetime.utcnow()
            await self.payment_repository.update(parent)
