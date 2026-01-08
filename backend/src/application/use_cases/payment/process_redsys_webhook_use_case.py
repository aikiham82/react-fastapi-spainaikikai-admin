"""Process Redsys Webhook use case."""

from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.exceptions.payment import PaymentNotFoundError, RedsysPaymentError
from src.application.ports.payment_repository import PaymentRepositoryPort


class ProcessRedsysWebhookUseCase:
    """Use case for processing Redsys webhook callbacks."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(self, transaction_id: str, status: str) -> Payment:
        """Execute to use case."""
        # Find payment by transaction ID
        payment = await self.payment_repository.find_by_transaction_id(transaction_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment with transaction {transaction_id} not found")

        # Process based on status
        if status == "success" or status == "completed":
            payment.complete_payment(transaction_id, "Redsys response data")
        elif status == "failed" or status == "error":
            payment.fail_payment("Redsys payment failed")
        elif status == "cancelled":
            payment.cancel_payment()
        else:
            raise RedsysPaymentError(f"Unknown Redsys status: {status}")

        return await self.payment_repository.update(payment)
