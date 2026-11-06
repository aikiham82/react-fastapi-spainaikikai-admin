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
from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import (
    INSURANCE_PAYMENT_TYPES,
    MemberPayment,
    MemberPaymentStatus,
    ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE,
)
from src.domain.entities.invoice import Invoice
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.use_cases.invoice.create_payment_invoice import create_payment_invoice
from src.application.use_cases.payment.refuse_lines_already_paid import refuse_lines_already_paid
from src.application.use_cases.payment.generate_licenses_and_insurance_from_payment_use_case import (
    GenerateLicensesAndInsuranceFromPaymentUseCase,
)
from src.application.use_cases.payment.initiate_annual_payment_use_case import PAYMENT_TYPE_TO_PRICE_KEY

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
    5. Create or renew the licences and insurance paid for (errors are logged).
    6. Generate Invoice (errors are logged but do not abort the operation).
    """

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        invoice_repository: InvoiceRepositoryPort,
        member_repository: MemberRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        pdf_service: Optional[PDFServicePort] = None,
        license_repository: Optional[LicenseRepositoryPort] = None,
        insurance_repository: Optional[InsuranceRepositoryPort] = None,
        club_repository: Optional[ClubRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository
        self.member_repository = member_repository
        self.price_configuration_repository = price_configuration_repository
        self.pdf_service = pdf_service
        self.license_repository = license_repository
        self.insurance_repository = insurance_repository
        self.club_repository = club_repository

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

        paid_at = datetime.utcnow()

        def line_year(mp_type) -> int:
            if mp_type in INSURANCE_PAYMENT_TYPES:
                return insurance_season_year(paid_at)
            return payment_year

        # 2. Duplicate check per (member_id, payment_type, line year).
        # club_fee is checked here too — a caller can include it in payment_types directly.
        await refuse_lines_already_paid(
            self.member_payment_repository,
            [(a.member_id, ptype) for a in member_assignments for ptype in a.payment_types],
            payment_year,
            paid_at,
        )

        # Duplicate check for the standalone include_club_fee path (club_fee assigned to
        # member_assignments[0]). Only needed when club_fee is NOT already in payment_types
        # (if it is already in payment_types the loop above already checked it).
        if include_club_fee:
            club_fee_types_already_checked = any(
                "club_fee" in a.payment_types for a in member_assignments
            )
            if not club_fee_types_already_checked:
                cf_member_id = member_assignments[0].member_id
                cf_mp_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE["club_fee"]
                cf_exists = await self.member_payment_repository.exists_for_member_year_type(
                    member_id=cf_member_id,
                    payment_year=payment_year,
                    payment_type=cf_mp_type,
                )
                if cf_exists:
                    raise DuplicatePaymentForYearError(cf_member_id, "club_fee", payment_year)

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
            payment_date=paid_at,
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
                payment_year=line_year(d["mp_type"]),
                payment_type=d["mp_type"],
                concept=f"{d['mp_type'].value} - {line_year(d['mp_type'])}",
                amount=d["price"],
                status=MemberPaymentStatus.COMPLETED,
            )
            for d in mp_defs
        ]
        created_member_payments = await self.member_payment_repository.create_bulk(member_payments)

        # 6. Create or renew the licences and insurance paid for
        await GenerateLicensesAndInsuranceFromPaymentUseCase(
            self.license_repository, self.insurance_repository
        ).execute(member_payments, parent_payment.id, payment_year, paid_at)

        # 7. Generate Invoice (errors are logged but do not abort the operation)
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

        Returns 0.0 only when item_type has no mapping in PAYMENT_TYPE_TO_PRICE_KEY
        (i.e. genuinely unmapped — no price applies). For mapped types where the
        price configuration record is missing from the DB, raises
        InvalidPaymentDataError to prevent silently-wrong totals.

        Mirrors InitiateAnnualPaymentUseCase._get_prices error behaviour.
        """
        price_key = PAYMENT_TYPE_TO_PRICE_KEY.get(item_type)
        if not price_key:
            # item_type has no price mapping — not a billable item, return 0.0
            return 0.0
        config = await self.price_configuration_repository.find_by_key(price_key)
        if config is None:
            raise InvalidPaymentDataError(
                f"Missing price configuration for '{item_type}'"
            )
        return config.price

    async def _create_invoice(self, payment: Payment) -> Optional[Invoice]:
        return await create_payment_invoice(
            payment, self.invoice_repository, self.member_repository, self.club_repository, self.pdf_service
        )
