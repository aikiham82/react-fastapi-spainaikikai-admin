"""Get Member Payment Status use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from src.domain.entities.member_payment import MemberPayment, MemberPaymentType
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class PaymentTypeStatus:
    """Status for a specific payment type."""
    payment_type: str
    is_paid: bool
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None


@dataclass
class MemberPaymentStatusResult:
    """Result containing member payment status for current year."""
    member_id: str
    member_name: str
    payment_year: int
    payment_statuses: List[PaymentTypeStatus]
    total_paid: float
    has_all_licenses: bool
    has_all_insurances: bool


class GetMemberPaymentStatusUseCase:
    """Use case for getting member's payment status for current year."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(
        self,
        member_id: str,
        payment_year: Optional[int] = None
    ) -> MemberPaymentStatusResult:
        """
        Get payment status for a member for the specified year.

        Args:
            member_id: The member ID to get status for.
            payment_year: The year to check. Defaults to current year.

        Returns:
            MemberPaymentStatusResult with all payment statuses.
        """
        if payment_year is None:
            payment_year = datetime.now().year

        # Get member info
        member = await self.member_repository.find_by_id(member_id)
        if not member:
            raise ValueError(f"Member with ID {member_id} not found")

        member_name = member.get_full_name()

        # Get all payments for the member in this year
        payments = await self.member_payment_repository.find_by_member_year(
            member_id=member_id,
            payment_year=payment_year
        )

        # Build payment status map
        paid_types = {}
        for payment in payments:
            if payment.is_completed:
                paid_types[payment.payment_type.value] = payment

        # Check all payment types
        payment_statuses = []
        total_paid = 0.0

        license_types = [
            MemberPaymentType.LICENCIA_KYU,
            MemberPaymentType.LICENCIA_KYU_INFANTIL,
            MemberPaymentType.LICENCIA_DAN,
            MemberPaymentType.TITULO_FUKUSHIDOIN,
            MemberPaymentType.TITULO_SHIDOIN,
        ]

        insurance_types = [
            MemberPaymentType.SEGURO_ACCIDENTES,
            MemberPaymentType.SEGURO_RC,
        ]

        # Check all payment types
        all_types = list(MemberPaymentType)
        has_license = False
        has_insurance_accidentes = False
        has_insurance_rc = False

        for ptype in all_types:
            payment = paid_types.get(ptype.value)
            is_paid = payment is not None

            if is_paid:
                total_paid += payment.amount
                if ptype in license_types:
                    has_license = True
                if ptype == MemberPaymentType.SEGURO_ACCIDENTES:
                    has_insurance_accidentes = True
                if ptype == MemberPaymentType.SEGURO_RC:
                    has_insurance_rc = True

            payment_statuses.append(PaymentTypeStatus(
                payment_type=ptype.value,
                is_paid=is_paid,
                amount=payment.amount if payment else None,
                payment_date=payment.created_at if payment else None
            ))

        return MemberPaymentStatusResult(
            member_id=member_id,
            member_name=member_name,
            payment_year=payment_year,
            payment_statuses=payment_statuses,
            total_paid=total_paid,
            has_all_licenses=has_license,
            has_all_insurances=has_insurance_accidentes and has_insurance_rc
        )
