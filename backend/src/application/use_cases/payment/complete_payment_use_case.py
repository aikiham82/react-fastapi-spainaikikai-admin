"""Fulfil a payment that has just been paid: what it bought, its invoice and the confirmation email."""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

from src.domain.entities.payment import Payment, PaymentType
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import (
    INSURANCE_PAYMENT_TYPES,
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
    ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
)
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.email_service import EmailServicePort
from src.application.ports.pdf_service import PDFServicePort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.use_cases.invoice.invoice_customer import build_invoice_customer
from src.application.use_cases.payment.initiate_annual_payment_use_case import PAYMENT_TYPE_TO_PRICE_KEY
from src.application.use_cases.payment.generate_licenses_and_insurance_from_payment_use_case import (
    GenerateLicensesAndInsuranceFromPaymentUseCase,
)
from src.config.settings import get_invoice_settings

logger = logging.getLogger(__name__)


@dataclass
class CompletedPayment:
    payment: Payment
    invoice: Optional[Invoice] = None


class CompletePaymentUseCase:
    """Fulfil a payment already marked as completed, whether Redsys or a super admin confirmed it."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
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

    async def execute(self, payment: Payment) -> CompletedPayment:
        invoice = None

        # --- Seminar oficialidad: mark as official on successful payment ---
        if (
            payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD
            and payment.related_entity_id
            and self.seminar_repository
        ):
            try:
                seminar = await self.seminar_repository.find_by_id(
                    payment.related_entity_id
                )
                if seminar and not seminar.is_official:
                    seminar.mark_as_official()
                    await self.seminar_repository.update(seminar)
            except Exception:
                logger.exception(
                    "Failed to mark seminar %s as official for payment %s",
                    payment.related_entity_id,
                    payment.id,
                )

        # Create member payment records if assignments exist
        if self.member_payment_repository and payment.member_assignments:
            paid_at = datetime.utcnow()
            member_payments = await self._create_member_payments(payment, paid_at)

            # Auto-generate licenses and insurance from member payments
            await GenerateLicensesAndInsuranceFromPaymentUseCase(
                self.license_repository, self.insurance_repository
            ).execute(member_payments, payment.id, payment.payment_year, paid_at)

        # Update payment status BEFORE invoice/email so it's always persisted
        payment = await self.payment_repository.update(payment)

        # Create invoice if repositories are available
        if self.invoice_repository and self.member_repository:
            try:
                invoice = await self._create_invoice(payment)
            except Exception:
                logger.exception(
                    "Failed to create invoice for payment %s", payment.id
                )

        await self._send_confirmation_email(payment, invoice)

        return CompletedPayment(payment=payment, invoice=invoice)

    async def _create_invoice(self, payment: Payment) -> Optional[Invoice]:
        """Create an invoice for a successful payment."""
        if not self.invoice_repository:
            return None

        customer = await build_invoice_customer(payment, self.member_repository, self.club_repository)

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
            member_id=payment.member_id or payment.club_id,
            club_id=payment.club_id,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_address=customer.address,
            customer_phone=customer.phone,
            line_items=line_items,
            status=InvoiceStatus.ISSUED,
            issue_date=datetime.utcnow(),
            payment_date=payment.payment_date or datetime.utcnow(),
            payment_method=payment.payment_method.value,
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
        """Send the payment confirmation, with the invoice PDF, to whoever the invoice is addressed to."""
        if not self.email_service:
            return

        customer = await build_invoice_customer(payment, self.member_repository, self.club_repository)
        if not customer.email:
            return

        invoice_pdf = None
        if invoice and invoice.pdf_path and self.pdf_service:
            try:
                with open(invoice.pdf_path, "rb") as f:
                    invoice_pdf = f.read()
            except Exception:
                pass

        try:
            await self.email_service.send_payment_confirmation(
                to_email=customer.email,
                member_name=customer.name,
                payment_amount=payment.amount,
                license_type=payment.payment_type.value,
                invoice_pdf=invoice_pdf
            )
        except Exception:
            logger.warning("Payment confirmation email failed for payment %s", payment.id, exc_info=True)

    async def _create_member_payments(self, payment: Payment, paid_at: datetime) -> List[MemberPayment]:
        """Create individual MemberPayment records from payment assignments.

        This is called when an annual payment is completed and has member
        assignments defined. It creates a MemberPayment record for each
        member and payment type combination.

        Members that no longer exist are skipped gracefully.

        Returns:
            List of created MemberPayment records.
        """
        if not self.member_payment_repository or not payment.member_assignments:
            return []

        try:
            assignments = json.loads(payment.member_assignments)
        except (json.JSONDecodeError, TypeError):
            return []

        member_payments: List[MemberPayment] = []
        club_fee_created = False
        # Priority for club fee assignment: admin(3) > shidoin(2) > fukushidoin(1) > first(0)
        club_fee_member_id = None
        club_fee_priority = -1

        for assignment in assignments:
            member_id = assignment.get("member_id")
            member_name = assignment.get("member_name", "")
            payment_types = assignment.get("payment_types", [])

            # Skip if member_id is missing
            if not member_id:
                continue

            # Verify member still exists (handle deleted members gracefully)
            member = None
            if self.member_repository:
                try:
                    member = await self.member_repository.find_by_id(member_id)
                    if not member:
                        # Member was deleted, skip their payments
                        continue
                except Exception:
                    # If lookup fails, skip this member
                    continue

            # Determine best member for club fee assignment
            priority = 0  # default: first valid member
            if member and getattr(member, 'club_role', '') == 'admin':
                priority = 3
            elif "shidoin" in payment_types:
                priority = 2
            elif "fukushidoin" in payment_types:
                priority = 1
            if priority > club_fee_priority:
                club_fee_member_id = member_id
                club_fee_priority = priority

            for ptype in payment_types:
                # Map item type to member payment type
                member_payment_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if not member_payment_type:
                    continue

                # Club fee is per-club, only create one record
                if ptype == "club_fee":
                    if club_fee_created:
                        continue
                    club_fee_created = True

                # Get price for this payment type from database
                price = 0.0
                if self.price_configuration_repository:
                    price_key = PAYMENT_TYPE_TO_PRICE_KEY.get(ptype)
                    if price_key:
                        price_config = await self.price_configuration_repository.find_by_key(price_key)
                        if price_config:
                            price = price_config.price

                payment_year = (
                    insurance_season_year(paid_at)
                    if member_payment_type in INSURANCE_PAYMENT_TYPES
                    else payment.payment_year
                )
                member_payments.append(MemberPayment(
                    payment_id=payment.id,
                    member_id=member_id,
                    payment_year=payment_year,
                    payment_type=member_payment_type,
                    concept=f"{member_payment_type.value} - {payment_year}",
                    amount=price,
                    status=MemberPaymentStatus.COMPLETED
                ))

        # Create club fee MemberPayment from line_items_data if not already
        # created from member_assignments (club_fee is a club-level item that
        # may not appear in any member's payment_types)
        if not club_fee_created and club_fee_member_id and payment.line_items_data:
            try:
                line_items = json.loads(payment.line_items_data)
                has_club_fee_item = any(
                    item.get("item_type") == "club_fee" for item in line_items
                )
                if has_club_fee_item:
                    price = 0.0
                    if self.price_configuration_repository:
                        price_key = PAYMENT_TYPE_TO_PRICE_KEY.get("club_fee")
                        if price_key:
                            price_config = await self.price_configuration_repository.find_by_key(price_key)
                            if price_config:
                                price = price_config.price

                    member_payments.append(MemberPayment(
                        payment_id=payment.id,
                        member_id=club_fee_member_id,
                        payment_year=payment.payment_year,
                        payment_type=MemberPaymentType.CUOTA_CLUB,
                        concept=f"cuota_club - {payment.payment_year}",
                        amount=price,
                        status=MemberPaymentStatus.COMPLETED
                    ))
            except (json.JSONDecodeError, TypeError):
                pass

        # Bulk create all member payments
        if member_payments:
            await self.member_payment_repository.create_bulk(member_payments)

        return member_payments
