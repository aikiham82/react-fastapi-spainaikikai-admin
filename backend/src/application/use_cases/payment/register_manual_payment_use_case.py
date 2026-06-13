"""Register Manual Payment use case.

Orchestrates creating a parent Payment + per-member MemberPayment lines + an Invoice
for offline/manual payments (cash, transfer, etc.).
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod
from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE,
)
from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.application.use_cases.payment.initiate_annual_payment_use_case import PAYMENT_TYPE_TO_PRICE_KEY
from src.config.settings import get_invoice_settings

logger = logging.getLogger(__name__)


@dataclass
class ManualMemberAssignment:
    """Assignment of payment types to a specific member for a manual payment."""

    member_id: str
    member_name: str
    payment_types: List[str]  # item_type keys, e.g. "kyu", "seguro_accidentes"

    def to_dict(self) -> dict:
        return {
            "member_id": self.member_id,
            "member_name": self.member_name,
            "payment_types": self.payment_types,
        }


@dataclass
class RegisterManualPaymentResult:
    """Result of registering a manual payment."""

    payment: Payment
    member_payments: List[MemberPayment]
    invoice: Optional[Invoice]


class RegisterManualPaymentUseCase:
    """Use case for registering a manual (offline) payment.

    Flow:
    1. Validate inputs (non-empty assignments, no duplicates per member/type/year).
    2. Fetch prices for each item type and compute total.
    3. Create parent Payment with status=COMPLETED and requested payment_method.
    4. Create MemberPayment lines using the real payment_id from step 3.
    5. Generate Invoice (errors are logged but do not abort the operation).
    """

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        invoice_repository: InvoiceRepositoryPort,
        member_repository: MemberRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        pdf_service: Optional[PDFServicePort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository
        self.member_repository = member_repository
        self.price_configuration_repository = price_configuration_repository
        self.pdf_service = pdf_service

    async def execute(
        self,
        payer_name: str,
        club_id: str,
        payment_year: int,
        payment_method: str,
        member_assignments: List[ManualMemberAssignment],
        include_club_fee: bool = False,
    ) -> RegisterManualPaymentResult:
        """Register a manual payment.

        Args:
            payer_name: Name of the admin/payer registering the payment.
            club_id: ID of the club associated with the payment.
            payment_year: Year the payment covers.
            payment_method: Payment method string ("cash", "transfer", "other").
            member_assignments: List of member-to-payment-types assignments.
            include_club_fee: Whether to add a club fee line if not already present.

        Returns:
            RegisterManualPaymentResult with payment, member_payments, and invoice.

        Raises:
            InvalidPaymentDataError: If member_assignments is empty.
            DuplicatePaymentForYearError: If any (member_id, type, year) already paid.
        """
        # 1. Validate inputs
        if not member_assignments:
            raise InvalidPaymentDataError("Al menos una línea de pago es requerida")

        # 2. Duplicate check per (member_id, payment_type, payment_year)
        for assignment in member_assignments:
            for ptype in assignment.payment_types:
                if ptype == "club_fee":
                    continue  # club_fee duplicate check handled via include_club_fee logic
                mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if mp_type is None:
                    continue
                already_exists = await self.member_payment_repository.exists_for_member_year_type(
                    member_id=assignment.member_id,
                    payment_year=payment_year,
                    payment_type=mp_type,
                )
                if already_exists:
                    raise DuplicatePaymentForYearError(assignment.member_id, ptype, payment_year)

        # 3. Build MemberPayment definitions and compute total
        mp_defs: List[dict] = []
        total_amount = 0.0
        club_fee_created = False
        line_items_for_invoice = []

        for assignment in member_assignments:
            for ptype in assignment.payment_types:
                mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(ptype)
                if mp_type is None:
                    continue
                if ptype == "club_fee":
                    if club_fee_created:
                        continue
                    club_fee_created = True

                price = await self._fetch_price(ptype)
                mp_defs.append({
                    "member_id": assignment.member_id,
                    "mp_type": mp_type,
                    "price": price,
                    "ptype": ptype,
                })
                line_items_for_invoice.append({
                    "item_type": ptype,
                    "description": f"{mp_type.value} - {payment_year}",
                    "quantity": 1,
                    "unit_price": price,
                    "total": price,
                })
                total_amount += price

        # Handle standalone club_fee if include_club_fee requested and not yet added
        if include_club_fee and not club_fee_created and member_assignments:
            price = await self._fetch_price("club_fee")
            club_fee_member_id = member_assignments[0].member_id
            mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE["club_fee"]
            mp_defs.append({
                "member_id": club_fee_member_id,
                "mp_type": mp_type,
                "price": price,
                "ptype": "club_fee",
            })
            line_items_for_invoice.append({
                "item_type": "club_fee",
                "description": f"cuota_club - {payment_year}",
                "quantity": 1,
                "unit_price": price,
                "total": price,
            })
            total_amount += price

        # 4. Create parent Payment (status=COMPLETED, payment_method from request)
        # IMPORTANT: Payment must be created FIRST to get its real id before
        # building MemberPayment objects (MemberPayment.__post_init__ rejects empty payment_id).
        parent_payment = Payment(
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_method=PaymentMethod(payment_method),
            amount=total_amount,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            payment_year=payment_year,
            payer_name=payer_name,
            line_items_data=json.dumps(line_items_for_invoice),
            member_assignments=json.dumps([a.to_dict() for a in member_assignments]),
        )
        parent_payment = await self.payment_repository.create(parent_payment)

        # 5. Create MemberPayment lines using the real payment_id
        member_payments = [
            MemberPayment(
                payment_id=parent_payment.id,
                member_id=d["member_id"],
                payment_year=payment_year,
                payment_type=d["mp_type"],
                concept=f"{d['mp_type'].value} - {payment_year}",
                amount=d["price"],
                status=MemberPaymentStatus.COMPLETED,
            )
            for d in mp_defs
        ]
        created_member_payments = await self.member_payment_repository.create_bulk(member_payments)

        # 6. Generate Invoice (errors are logged but do not abort the operation)
        invoice = None
        try:
            invoice = await self._create_invoice(parent_payment)
        except Exception:
            logger.exception(
                "Failed to create invoice for manual payment %s", parent_payment.id
            )

        return RegisterManualPaymentResult(
            payment=parent_payment,
            member_payments=created_member_payments,
            invoice=invoice,
        )

    async def _fetch_price(self, item_type: str) -> float:
        """Fetch price from price_configuration by item_type key.

        Returns 0.0 if the key is unknown or the config is not found.
        The PriceConfiguration entity uses the `.price` attribute.
        """
        price_key = PAYMENT_TYPE_TO_PRICE_KEY.get(item_type)
        if not price_key or not self.price_configuration_repository:
            return 0.0
        config = await self.price_configuration_repository.find_by_key(price_key)
        return config.price if config else 0.0

    async def _create_invoice(self, payment: Payment) -> Optional[Invoice]:
        """Create an invoice for the manual payment.

        Mirrors ProcessRedsysWebhookUseCase._create_invoice but avoids
        the pre-existing bug that passes non-existent kwargs (license_id, paid_date)
        to the Invoice constructor.

        Invoice entity fields used: invoice_number, payment_id, member_id, club_id,
        customer_name, customer_email, line_items, status, issue_date.
        Totals (tax_total, total) are computed by invoice.calculate_totals().
        """
        if not self.invoice_repository:
            return None

        customer_name = payment.payer_name or ""
        customer_email = ""

        # Attempt to enrich customer email from member record
        if self.member_repository and payment.member_id:
            member = await self.member_repository.find_by_id(payment.member_id)
            if member:
                customer_email = getattr(member, "email", "") or ""

        invoice_year = payment.payment_year or datetime.utcnow().year
        invoice_number = await self.invoice_repository.get_next_invoice_number(invoice_year)
        invoice_settings = get_invoice_settings()

        # Build line items from line_items_data JSON stored on the payment
        line_items: List[InvoiceLineItem] = []
        if payment.line_items_data:
            try:
                items_data = json.loads(payment.line_items_data)
                for item in items_data:
                    line_items.append(InvoiceLineItem(
                        description=item.get("description", ""),
                        quantity=item.get("quantity", 1),
                        unit_price=item.get("unit_price", 0),
                        tax_rate=invoice_settings.tax_rate * 100,  # convert fraction -> percentage
                    ))
            except (json.JSONDecodeError, KeyError):
                line_items = [InvoiceLineItem(
                    description=f"Pago manual - {payment.payment_year}",
                    quantity=1,
                    unit_price=payment.amount,
                    tax_rate=invoice_settings.tax_rate * 100,
                )]
        else:
            line_items = [InvoiceLineItem(
                description=f"Pago manual - {payment.payment_year}",
                quantity=1,
                unit_price=payment.amount,
                tax_rate=invoice_settings.tax_rate * 100,
            )]

        # Construct Invoice using only actual entity fields.
        # Use club_id as member_id fallback: manual payments are at club level and have no member_id.
        # Invoice.__post_init__ requires non-empty member_id.
        invoice_member_id = payment.member_id or payment.club_id or "unknown"

        invoice = Invoice(
            invoice_number=invoice_number,
            payment_id=payment.id,
            member_id=invoice_member_id,
            club_id=payment.club_id,
            customer_name=customer_name,
            customer_email=customer_email,
            line_items=line_items,
            status=InvoiceStatus.ISSUED,
            issue_date=datetime.utcnow(),
        )
        # Populate tax_total and total fields from line items
        invoice.calculate_totals()

        if self.pdf_service:
            try:
                pdf_path = await self.pdf_service.save_invoice_pdf(
                    invoice=invoice,
                    output_dir=invoice_settings.output_dir,
                    company_name=invoice_settings.company_name,
                    company_address=invoice_settings.company_address,
                    company_tax_id=invoice_settings.company_tax_id,
                    logo_path=invoice_settings.logo_path if invoice_settings.logo_path else None,
                )
                invoice.pdf_path = pdf_path
            except Exception:
                pass

        return await self.invoice_repository.create(invoice)
