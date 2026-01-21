"""Create Payment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.domain.exceptions.payment import DuplicatePaymentForYearError
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
        related_entity_id: Optional[str] = None,
        payment_year: Optional[int] = None
    ) -> Payment:
        """Execute to use case."""
        # Default to current year if not provided
        year = payment_year or datetime.now().year

        # Check for duplicate payment (only for member-specific payments)
        if member_id:
            existing = await self.payment_repository.find_by_member_type_year(
                member_id, PaymentType(payment_type), year
            )
            if existing:
                raise DuplicatePaymentForYearError(member_id, payment_type, year)

        payment = Payment(
            member_id=member_id,
            club_id=club_id,
            payment_type=PaymentType(payment_type),
            amount=amount,
            status=PaymentStatus.PENDING,
            related_entity_id=related_entity_id,
            payment_year=year
        )

        return await self.payment_repository.create(payment)
