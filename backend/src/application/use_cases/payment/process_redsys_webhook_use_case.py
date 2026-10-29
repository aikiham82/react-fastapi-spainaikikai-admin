"""Process Redsys Webhook use case."""

from dataclasses import dataclass
from typing import Optional

from src.domain.entities.payment import Payment
from src.domain.entities.invoice import Invoice
from src.domain.exceptions.payment import PaymentNotFoundError, RedsysSignatureError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.redsys_service import RedsysServicePort
from src.application.ports.email_service import EmailServicePort
from src.application.ports.pdf_service import PDFServicePort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.use_cases.payment.complete_payment_use_case import CompletePaymentUseCase


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
        invoice_repository: Optional[InvoiceRepositoryPort] = None,
        license_repository: Optional[LicenseRepositoryPort] = None,
        insurance_repository: Optional[InsuranceRepositoryPort] = None,
        member_repository: Optional[MemberRepositoryPort] = None,
        member_payment_repository: Optional[MemberPaymentRepositoryPort] = None,
        email_service: Optional[EmailServicePort] = None,
        pdf_service: Optional[PDFServicePort] = None,
        price_configuration_repository: Optional[PriceConfigurationRepositoryPort] = None,
        seminar_repository: Optional[SeminarRepositoryPort] = None,
        club_repository: Optional[ClubRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service
        self.invoice_repository = invoice_repository
        self.license_repository = license_repository
        self.insurance_repository = insurance_repository
        self.member_repository = member_repository
        self.member_payment_repository = member_payment_repository
        self.email_service = email_service
        self.pdf_service = pdf_service
        self.price_configuration_repository = price_configuration_repository
        self.seminar_repository = seminar_repository
        self.club_repository = club_repository
        self.complete_payment_use_case = CompletePaymentUseCase(
            payment_repository=payment_repository,
            invoice_repository=invoice_repository,
            license_repository=license_repository,
            insurance_repository=insurance_repository,
            member_repository=member_repository,
            member_payment_repository=member_payment_repository,
            email_service=email_service,
            pdf_service=pdf_service,
            price_configuration_repository=price_configuration_repository,
            seminar_repository=seminar_repository,
            club_repository=club_repository,
        )

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

        # Process based on response
        if notification.is_successful:
            # Complete payment
            payment.complete_payment(
                transaction_id=notification.order_id,
                redsys_response=payment.redsys_response
            )

            completed = await self.complete_payment_use_case.execute(payment)
            payment, invoice = completed.payment, completed.invoice

            message = self.redsys_service.get_response_message(notification.response_code)
        else:
            # Payment failed
            error_message = self.redsys_service.get_response_message(notification.response_code)
            payment.fail_payment(error_message)
            message = error_message

            # Persist FAILED status
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

