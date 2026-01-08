"""Delete Payment use case."""

from src.domain.exceptions.payment import PaymentNotFoundError
from src.application.ports.payment_repository import PaymentRepositoryPort


class DeletePaymentUseCase:
    """Use case for deleting a payment."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(self, payment_id: str) -> bool:
        """Execute to use case."""
        if not await self.payment_repository.exists(payment_id):
            raise PaymentNotFoundError(payment_id)

        return await self.payment_repository.delete(payment_id)
