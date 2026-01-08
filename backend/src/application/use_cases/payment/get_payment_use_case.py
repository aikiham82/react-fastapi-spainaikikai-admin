"""Get Payment use case."""

from src.domain.entities.payment import Payment
from src.domain.exceptions.payment import PaymentNotFoundError
from src.application.ports.payment_repository import PaymentRepositoryPort


class GetPaymentUseCase:
    """Use case for getting a payment by ID."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(self, payment_id: str) -> Payment:
        """Execute to use case."""
        payment = await self.payment_repository.find_by_id(payment_id)
        if payment is None:
            raise PaymentNotFoundError(payment_id)
        return payment
