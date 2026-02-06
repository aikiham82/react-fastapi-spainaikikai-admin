"""Process Redsys Webhook use case."""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

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
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.redsys_service import RedsysServicePort
from src.application.ports.email_service import EmailServicePort
from src.application.ports.pdf_service import PDFServicePort
from src.config.settings import get_invoice_settings
from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
    ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
)
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.use_cases.payment.initiate_annual_payment_use_case import PAYMENT_TYPE_TO_PRICE_KEY


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
        member_payment_repository: Optional[MemberPaymentRepositoryPort] = None,
        email_service: Optional[EmailServicePort] = None,
        pdf_service: Optional[PDFServicePort] = None,
        price_configuration_repository: Optional[PriceConfigurationRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service
        self.invoice_repository = invoice_repository
        self.license_repository = license_repository
        self.member_repository = member_repository
        self.member_payment_repository = member_payment_repository
        self.email_service = email_service
        self.pdf_service = pdf_service
        self.price_configuration_repository = price_configuration_repository

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

            # Create member payment records if assignments exist
            if self.member_payment_repository and payment.member_assignments:
                await self._create_member_payments(payment)

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

        # For annual payments, use payer_name if available
        if payment.payer_name:
            customer_name = payment.payer_name

        # Get next invoice number (use payment year for multi-year support)
        invoice_year = payment.payment_year or datetime.now().year
        invoice_number = await self.invoice_repository.get_next_invoice_number(invoice_year)

        # Get invoice settings
        invoice_settings = get_invoice_settings()

        # Create line items - check if payment has line_items_data (annual payments)
        line_items: List[InvoiceLineItem] = []
        if payment.line_items_data:
            try:
                items_data = json.loads(payment.line_items_data)
                for item in items_data:
                    line_items.append(InvoiceLineItem(
                        description=item.get("description", ""),
                        quantity=item.get("quantity", 1),
                        unit_price=item.get("unit_price", 0),
                        tax_rate=invoice_settings.tax_rate * 100  # Convert to percentage
                    ))
            except (json.JSONDecodeError, KeyError):
                # Fallback to single line item if parsing fails
                line_items = [
                    InvoiceLineItem(
                        description=f"Pago anual - {payment.payment_type.value}",
                        quantity=1,
                        unit_price=payment.amount,
                        tax_rate=invoice_settings.tax_rate * 100
                    )
                ]
        else:
            # Standard single line item for non-annual payments
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

    async def _create_member_payments(self, payment: Payment) -> None:
        """Create individual MemberPayment records from payment assignments.

        This is called when an annual payment is completed and has member
        assignments defined. It creates a MemberPayment record for each
        member and payment type combination.

        Members that no longer exist are skipped gracefully.
        """
        if not self.member_payment_repository or not payment.member_assignments:
            return

        try:
            assignments = json.loads(payment.member_assignments)
        except (json.JSONDecodeError, TypeError):
            return

        member_payments: List[MemberPayment] = []

        for assignment in assignments:
            member_id = assignment.get("member_id")
            member_name = assignment.get("member_name", "")
            payment_types = assignment.get("payment_types", [])

            # Skip if member_id is missing
            if not member_id:
                continue

            # Verify member still exists (handle deleted members gracefully)
            if self.member_repository:
                try:
                    member = await self.member_repository.find_by_id(member_id)
                    if not member:
                        # Member was deleted, skip their payments
                        continue
                except Exception:
                    # If lookup fails, skip this member
                    continue

            for ptype in payment_types:
                # Map item type to member payment type
                member_payment_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if not member_payment_type:
                    continue

                # Get price for this payment type from database
                price = 0.0
                if self.price_configuration_repository:
                    price_key = PAYMENT_TYPE_TO_PRICE_KEY.get(ptype)
                    if price_key:
                        price_config = await self.price_configuration_repository.find_by_key(price_key)
                        if price_config:
                            price = price_config.price

                member_payments.append(MemberPayment(
                    payment_id=payment.id,
                    member_id=member_id,
                    payment_year=payment.payment_year,
                    payment_type=member_payment_type,
                    concept=f"{member_payment_type.value} - {payment.payment_year}",
                    amount=price,
                    status=MemberPaymentStatus.COMPLETED
                ))

        # Bulk create all member payments
        if member_payments:
            await self.member_payment_repository.create_bulk(member_payments)
