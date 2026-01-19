"""Initiate Redsys Payment use case."""

from typing import Optional
from dataclasses import dataclass

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.redsys_service import (
    RedsysServicePort,
    RedsysPaymentRequest,
    RedsysPaymentFormData
)


@dataclass
class InitiatePaymentResult:
    """Result of initiating a Redsys payment."""
    payment_id: str
    order_id: str
    form_data: RedsysPaymentFormData


class InitiateRedsysPaymentUseCase:
    """Use case for initiating payment through Redsys."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        redsys_service: RedsysServicePort
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service

    async def execute(
        self,
        member_id: Optional[str],
        club_id: Optional[str],
        payment_type: str,
        amount: float,
        success_url: str,
        failure_url: str,
        webhook_url: str,
        related_entity_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> InitiatePaymentResult:
        """
        Execute the use case and return Redsys form data.

        Args:
            member_id: Optional member ID
            club_id: Optional club ID
            payment_type: Type of payment (license_fee, seminar_registration, etc.)
            amount: Payment amount in EUR
            success_url: URL to redirect on successful payment
            failure_url: URL to redirect on failed payment
            webhook_url: URL for Redsys to send payment notifications
            related_entity_id: ID of related entity (license_id, seminar_id, etc.)
            description: Optional description for the payment

        Returns:
            InitiatePaymentResult with payment ID, order ID and form data
        """
        # Create pending payment
        payment = Payment(
            member_id=member_id,
            club_id=club_id,
            payment_type=PaymentType(payment_type),
            amount=amount,
            status=PaymentStatus.PENDING,
            related_entity_id=related_entity_id
        )
        payment = await self.payment_repository.create(payment)

        # Generate Redsys order ID
        order_id = self.redsys_service.generate_order_id(payment.id)

        # Mark as processing and store order ID
        payment.mark_as_processing()
        payment.transaction_id = order_id
        await self.payment_repository.update(payment)

        # Convert amount to cents (Redsys uses cents)
        amount_cents = int(amount * 100)

        # Create Redsys payment request
        redsys_request = RedsysPaymentRequest(
            order_id=order_id,
            amount_cents=amount_cents,
            description=description or f"Pago {payment_type}",
            merchant_url=webhook_url,
            ok_url=success_url,
            ko_url=failure_url,
            product_description=description
        )

        # Generate form data
        form_data = await self.redsys_service.create_payment_form_data(redsys_request)

        return InitiatePaymentResult(
            payment_id=payment.id,
            order_id=order_id,
            form_data=form_data
        )
