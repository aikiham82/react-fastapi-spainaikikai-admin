"""Update MemberPayment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus
from src.domain.entities.payment import PaymentStatus
from src.domain.exceptions.payment import MemberPaymentNotFoundError, InvalidPaymentDataError
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort


class UpdateMemberPaymentUseCase:
    """Use case for editing a MemberPayment line.

    After editing, recomputes parent Payment.amount = sum of COMPLETED lines.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.payment_repository = payment_repository

    async def execute(
        self,
        member_payment_id: str,
        payment_type: Optional[str] = None,
        concept: Optional[str] = None,
        amount: Optional[float] = None,
        status: Optional[str] = None,
    ) -> MemberPayment:
        mp = await self.member_payment_repository.find_by_id(member_payment_id)
        if not mp:
            raise MemberPaymentNotFoundError(member_payment_id)

        if payment_type is not None:
            try:
                mp.payment_type = MemberPaymentType(payment_type)
            except ValueError:
                raise InvalidPaymentDataError(f"Tipo de pago inválido: {payment_type}")
        if concept is not None:
            mp.concept = concept
        if amount is not None:
            if amount < 0:
                raise InvalidPaymentDataError("El importe no puede ser negativo")
            mp.amount = amount
        if status is not None:
            try:
                mp.status = MemberPaymentStatus(status)
            except ValueError:
                raise InvalidPaymentDataError(f"Estado inválido: {status}")

        mp.updated_at = datetime.utcnow()
        updated_mp = await self.member_payment_repository.update(mp)

        # Recompute parent Payment.amount = sum of COMPLETED lines
        await self._recompute_parent_amount(updated_mp.payment_id)

        return updated_mp

    async def _recompute_parent_amount(self, payment_id: str) -> None:
        """Set Payment.amount = sum of all COMPLETED MemberPayment.amount."""
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
