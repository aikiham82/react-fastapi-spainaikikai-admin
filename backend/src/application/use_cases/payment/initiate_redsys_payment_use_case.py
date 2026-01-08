"""Initiate Redsys Payment use case."""

from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.ports.payment_repository import PaymentRepositoryPort


class InitiateRedsysPaymentUseCase:
    """Use case for initiating payment through Redsys."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        member_id: Optional[str],
        club_id: Optional[str],
        payment_type: str,
        amount: float,
        return_url: str,
        related_entity_id: Optional[str] = None
    ) -> dict:
        """Execute to use case and return Redsys parameters."""
        # Create pending payment
        payment = await CreatePaymentUseCase(self.payment_repository).execute(
            member_id=member_id,
            club_id=club_id,
            payment_type=payment_type,
            amount=amount,
            related_entity_id=related_entity_id
        )

        # Mark as processing
        payment.mark_as_processing()
        await self.payment_repository.update(payment)

        # TODO: Implement actual Redsys integration
        # This would involve:
        # 1. Generating encrypted parameters
        # 2. Creating Redsys payment request
        # 3. Returning payment URL and parameters

        return {
            "payment_id": payment.id,
            "redsys_url": "https://sis.redsys.es/sis/realizarPago",
            "merchant_parameters": "ENCRYPTED_PARAMETERS_HERE"
        }
