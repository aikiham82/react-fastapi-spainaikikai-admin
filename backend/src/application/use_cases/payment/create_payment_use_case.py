"""Create Payment use case."""

from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.ports.payment_repository import PaymentRepositoryPort


class CreatePaymentUseCase:
    """Use case for creating a new payment."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        member_id: Optional[str],
        club_id: Optional[str],
        payment_type: str,
        amount: float,
        related_entity_id: Optional[str] = None
    ) -> Payment:
        """Execute to use case."""
        payment = Payment(
            member_id=member_id,
            club_id=club_id,
            payment_type=PaymentType(payment_type),
            amount=amount,
            status=PaymentStatus.PENDING,
            related_entity_id=related_entity_id
        )

        return await self.payment_repository.create(payment)
