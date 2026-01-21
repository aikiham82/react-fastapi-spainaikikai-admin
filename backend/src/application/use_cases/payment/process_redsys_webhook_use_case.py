"""Process Redsys Webhook use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    RedsysPaymentError,
    RedsysSignatureError,
    RedsysWebhookError
)
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.redsys_service import RedsysServicePort
from src.application.ports.email_service import EmailServicePort
from src.application.ports.pdf_service import PDFServicePort
from src.config.settings import get_invoice_settings


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
        member_repository: Optional[MemberRepositoryPort] = None,
        email_service: Optional[EmailServicePort] = None,
        pdf_service: Optional[PDFServicePort] = None
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service
        self.invoice_repository = invoice_repository
        self.license_repository = license_repository
        self.member_repository = member_repository
        self.email_service = email_service
        self.pdf_service = pdf_service

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

            # Create invoice if repositories are available
            if self.invoice_repository and self.member_repository:
                invoice = await self._create_invoice(payment)

            # Send confirmation email
            if self.email_service and self.member_repository:
                await self._send_confirmation_email(payment, invoice)

            message = self.redsys_service.get_response_message(notification.response_code)
        else:
            # Payment failed
            error_message = self.redsys_service.get_response_message(notification.response_code)
            payment.fail_payment(error_message)
            message = error_message

            # Send failure notification
            if self.email_service and self.member_repository:
                await self._send_failure_email(payment, error_message)

        # Update payment
        payment = await self.payment_repository.update(payment)

        return WebhookProcessResult(
            payment=payment,
            success=notification.is_successful,
            message=message,
            invoice=invoice
        )

    async def _create_invoice(self, payment: Payment) -> Optional[Invoice]:
        """Create an invoice for a successful payment."""
        if not self.invoice_repository:
            return None

        # Get member info if available
        customer_name = None
        customer_email = None
        if self.member_repository and payment.member_id:
            member = await self.member_repository.find_by_id(payment.member_id)
            if member:
                customer_name = f"{member.nombre} {member.primer_apellido} {member.segundo_apellido or ''}".strip()
                customer_email = member.email

        # Get next invoice number (use payment year for multi-year support)
        invoice_year = payment.payment_year or datetime.now().year
        invoice_number = await self.invoice_repository.get_next_invoice_number(invoice_year)

        # Get invoice settings
        invoice_settings = get_invoice_settings()

        # Create line item
        line_items = [
            InvoiceLineItem(
                description=f"Pago de licencia - {payment.payment_type.value}",
                quantity=1,
                unit_price=payment.amount,
                tax_rate=invoice_settings.tax_rate * 100  # Convert to percentage
            )
        ]

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            payment_id=payment.id,
            member_id=payment.member_id or "",
            club_id=payment.club_id,
            license_id=payment.related_entity_id,
            customer_name=customer_name,
            customer_email=customer_email,
            line_items=line_items,
            status=InvoiceStatus.ISSUED,
            issue_date=datetime.now().isoformat(),
            paid_date=datetime.now().isoformat()
        )
        invoice.calculate_totals()

        # Generate PDF if service available
        if self.pdf_service:
            try:
                pdf_path = await self.pdf_service.save_invoice_pdf(
                    invoice=invoice,
                    output_dir=invoice_settings.output_dir,
                    company_name=invoice_settings.company_name,
                    company_address=invoice_settings.company_address,
                    company_tax_id=invoice_settings.company_tax_id,
                    logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None
                )
                invoice.pdf_path = pdf_path
            except Exception:
                # Log error but don't fail the webhook
                pass

        return await self.invoice_repository.create(invoice)

    async def _send_confirmation_email(
        self,
        payment: Payment,
        invoice: Optional[Invoice]
    ) -> None:
        """Send payment confirmation email."""
        if not self.email_service or not self.member_repository:
            return

        if not payment.member_id:
            return

        member = await self.member_repository.find_by_id(payment.member_id)
        if not member or not member.email:
            return

        member_name = f"{member.nombre} {member.primer_apellido}"

        # Get invoice PDF if available
        invoice_pdf = None
        if invoice and invoice.pdf_path and self.pdf_service:
            try:
                with open(invoice.pdf_path, "rb") as f:
                    invoice_pdf = f.read()
            except Exception:
                pass

        try:
            await self.email_service.send_payment_confirmation(
                to_email=member.email,
                member_name=member_name,
                payment_amount=payment.amount,
                license_type=payment.payment_type.value,
                invoice_pdf=invoice_pdf
            )
        except Exception:
            # Log error but don't fail
            pass

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

        member_name = f"{member.nombre} {member.primer_apellido}"

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
