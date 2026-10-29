"""Process Redsys Webhook use case."""

import logging
from dataclasses import dataclass
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.entities.invoice import Invoice
from src.domain.exceptions.payment import PaymentAlreadyCompletedError, PaymentNotFoundError, RedsysSignatureError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.redsys_service import RedsysServicePort
from src.application.ports.email_service import EmailServicePort
from src.application.use_cases.payment.complete_payment_use_case import CompletePaymentUseCase

logger = logging.getLogger(__name__)


@dataclass
class WebhookProcessResult:
    """Result of processing a Redsys webhook."""
    payment: Payment
    success: bool
    message: str
    invoice: Optional[Invoice] = None


class ProcessRedsysWebhookUseCase:
    """Use case for processing Redsys webhook callbacks."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        redsys_service: RedsysServicePort,
        complete_payment_use_case: CompletePaymentUseCase,
        member_repository: Optional[MemberRepositoryPort] = None,
        email_service: Optional[EmailServicePort] = None,
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service
        self.complete_payment_use_case = complete_payment_use_case
        self.member_repository = member_repository
        self.email_service = email_service

    async def execute(
        self,
        ds_signature: str,
        ds_merchant_parameters: str,
        ds_signature_version: str
    ) -> WebhookProcessResult:
        """
        Process a Redsys webhook notification.

        Args:
            ds_signature: The signature from Redsys
            ds_merchant_parameters: Base64-encoded merchant parameters
            ds_signature_version: Signature version (should be HMAC_SHA256_V1)

        Returns:
            WebhookProcessResult with payment status and optional invoice
        """
        # Verify signature
        is_valid = await self.redsys_service.verify_notification_signature(
            ds_signature=ds_signature,
            ds_merchant_parameters=ds_merchant_parameters
        )

        if not is_valid:
            raise RedsysSignatureError("Invalid webhook signature")

        # Parse notification data
        notification = await self.redsys_service.parse_notification(ds_merchant_parameters)

        # Find payment by order ID (stored as transaction_id)
        payment = await self.payment_repository.find_by_transaction_id(notification.order_id)

        if not payment:
            raise PaymentNotFoundError(f"Payment with order ID {notification.order_id} not found")

        # Store Redsys response
        payment.redsys_response = {
            "order_id": notification.order_id,
            "authorization_code": notification.authorization_code,
            "response_code": notification.response_code,
            "amount_cents": notification.amount_cents,
            "secure_payment": notification.secure_payment,
            "card_country": notification.card_country,
            "card_brand": notification.card_brand,
            "error_code": notification.error_code
        }

        invoice = None

        if payment.status == PaymentStatus.COMPLETED:
            logger.warning("Redsys notified order %s, already completed; nothing to fulfil", notification.order_id)
            return WebhookProcessResult(payment=payment, success=True, message="Pago ya completado")

        # Process based on response
        if notification.is_successful:
            # Complete payment
            payment.complete_payment(
                transaction_id=notification.order_id,
                redsys_response=payment.redsys_response
            )

            try:
                completed = await self.complete_payment_use_case.execute(payment)
            except PaymentAlreadyCompletedError:
                logger.warning("Redsys order %s was completed meanwhile; nothing to fulfil", notification.order_id)
                return WebhookProcessResult(payment=payment, success=True, message="Pago ya completado")
            payment, invoice = completed.payment, completed.invoice

            message = self.redsys_service.get_response_message(notification.response_code)
        else:
            # Payment failed
            error_message = self.redsys_service.get_response_message(notification.response_code)
            payment.fail_payment(error_message)
            message = error_message

            if not await self.payment_repository.claim_unfinished(payment.id, PaymentStatus.FAILED):
                logger.warning("Redsys order %s failed after it was completed; kept completed", notification.order_id)
                return WebhookProcessResult(payment=payment, success=False, message=message)
            payment = await self.payment_repository.update(payment)

            # Send failure notification
            if self.email_service and self.member_repository:
                await self._send_failure_email(payment, error_message)

        return WebhookProcessResult(
            payment=payment,
            success=notification.is_successful,
            message=message,
            invoice=invoice
        )

    async def _send_failure_email(
        self,
        payment: Payment,
        error_message: str
    ) -> None:
        """Send payment failure notification email."""
        if not self.email_service or not self.member_repository:
            return

        if not payment.member_id:
            return

        member = await self.member_repository.find_by_id(payment.member_id)
        if not member or not member.email:
            return

        member_name = member.get_full_name()

        try:
            # TODO: Get retry URL from configuration
            retry_url = "https://example.com/payments/retry"
            await self.email_service.send_payment_failed_notification(
                to_email=member.email,
                member_name=member_name,
                error_message=error_message,
                retry_url=retry_url
            )
        except Exception:
            # Log error but don't fail
            pass

