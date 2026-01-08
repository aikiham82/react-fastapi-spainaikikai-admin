"""Refund Payment use case."""

from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.exceptions.payment import PaymentNotFoundError, PaymentNotRefundableError
from src.application.ports.payment_repository import PaymentRepositoryPort


class RefundPaymentUseCase:
    """Use case for refunding a payment."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(self, payment_id: str, refund_amount: Optional[float] = None) -> Payment:
        """Execute to use case."""
        payment = await self.payment_repository.find_by_id(payment_id)
        if payment is None:
            raise PaymentNotFoundError(payment_id)

        if not payment.is_refundable():
            raise PaymentNotRefundableError(f"Payment {payment_id} is not refundable")

        # TODO: Implement actual Redsys refund integration
        # This would involve:
        # 1. Calling Redsys refund API
        # 2. Processing refund response

        # Mark as refunded
        payment.refund_payment(refund_amount)

        return await self.payment_repository.update(payment)
