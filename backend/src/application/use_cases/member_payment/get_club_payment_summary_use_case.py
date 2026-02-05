"""Get Club Payment Summary use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from src.domain.entities.member_payment import MemberPaymentStatus
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class PaymentTypeSummary:
    """Summary for a specific payment type."""
    payment_type: str
    paid_count: int
    total_amount: float


@dataclass
class MemberPaymentSummary:
    """Summary of a member's payment status."""
    member_id: str
    member_name: str
    license_paid: bool
    insurance_paid: bool
    total_paid: float


@dataclass
class ClubPaymentSummaryResult:
    """Result containing club payment summary for a year."""
    club_id: str
    club_name: str
    payment_year: int
    total_members: int
    members_with_license: int
    members_with_insurance: int
    total_collected: float
    by_payment_type: List[PaymentTypeSummary]
    members: List[MemberPaymentSummary]


class GetClubPaymentSummaryUseCase:
    """Use case for getting club payment summary for a year."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        club_repository: ClubRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.member_payment_repository = member_payment_repository
        self.club_repository = club_repository
        self.member_repository = member_repository

    async def execute(
        self,
        club_id: str,
        payment_year: Optional[int] = None
    ) -> ClubPaymentSummaryResult:
        """
        Get payment summary for a club for the specified year.

        Args:
            club_id: The club ID to get summary for.
            payment_year: The year to check. Defaults to current year.

        Returns:
            ClubPaymentSummaryResult with summary data.
        """
        if payment_year is None:
            payment_year = datetime.now().year

        # Get club info
        club = await self.club_repository.find_by_id(club_id)
        if not club:
            raise ValueError(f"Club with ID {club_id} not found")

        # Get all club members
        members = await self.member_repository.find_by_club_id(club_id)
        total_members = len(members)
        member_ids = [m.id for m in members if m.id]

        # Get aggregated summary using member IDs
        summary = await self.member_payment_repository.get_summary_by_member_ids(
            member_ids=member_ids,
            payment_year=payment_year
        )

        # Get all payments for detailed member-level summary
        payments = await self.member_payment_repository.find_by_member_ids_year(
            member_ids=member_ids,
            payment_year=payment_year,
            status=MemberPaymentStatus.COMPLETED
        )

        # Build member-level payment map
        member_payments: Dict[str, Dict] = {}
        for payment in payments:
            if payment.member_id not in member_payments:
                member_payments[payment.member_id] = {
                    "license_paid": False,
                    "insurance_paid": False,
                    "total_paid": 0.0
                }

            if payment.is_license_payment:
                member_payments[payment.member_id]["license_paid"] = True
            if payment.is_insurance_payment:
                member_payments[payment.member_id]["insurance_paid"] = True

            member_payments[payment.member_id]["total_paid"] += payment.amount

        # Build member summaries
        member_summaries = []
        members_with_license = 0
        members_with_insurance = 0

        for member in members:
            member_data = member_payments.get(member.id, {
                "license_paid": False,
                "insurance_paid": False,
                "total_paid": 0.0
            })

            if member_data["license_paid"]:
                members_with_license += 1
            if member_data["insurance_paid"]:
                members_with_insurance += 1

            member_summaries.append(MemberPaymentSummary(
                member_id=member.id,
                member_name=member.get_full_name(),
                license_paid=member_data["license_paid"],
                insurance_paid=member_data["insurance_paid"],
                total_paid=member_data["total_paid"]
            ))

        # Build payment type summaries
        by_payment_type = []
        for ptype, data in summary.get("by_type", {}).items():
            by_payment_type.append(PaymentTypeSummary(
                payment_type=ptype,
                paid_count=data["count"],
                total_amount=data["amount"]
            ))

        return ClubPaymentSummaryResult(
            club_id=club_id,
            club_name=club.nombre if hasattr(club, 'nombre') else club.name if hasattr(club, 'name') else "",
            payment_year=payment_year,
            total_members=total_members,
            members_with_license=members_with_license,
            members_with_insurance=members_with_insurance,
            total_collected=summary.get("total_amount", 0.0),
            by_payment_type=by_payment_type,
            members=member_summaries
        )
