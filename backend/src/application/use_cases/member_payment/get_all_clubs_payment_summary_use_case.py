"""Get All Clubs Payment Summary use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from src.domain.entities.member_payment import MemberPaymentStatus, MemberPaymentType
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class ClubSummaryItem:
    """Summary for a single club."""
    club_id: str
    club_name: str
    total_members: int
    members_with_license: int
    members_with_insurance: int
    total_collected: float
    has_club_fee: bool


@dataclass
class AllClubsPaymentSummaryResult:
    """Result containing payment summaries for all clubs."""
    payment_year: int
    clubs: List[ClubSummaryItem]
    grand_total_collected: float
    grand_total_members: int


class GetAllClubsPaymentSummaryUseCase:
    """Use case for getting payment summaries across all clubs."""

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
        payment_year: Optional[int] = None
    ) -> AllClubsPaymentSummaryResult:
        if payment_year is None:
            payment_year = datetime.now().year

        clubs = await self.club_repository.find_all()

        club_summaries = []
        grand_total = 0.0
        grand_total_members = 0

        for club in clubs:
            if not club.id or not club.is_active:
                continue

            all_members = await self.member_repository.find_by_club_id(club.id)
            members = [m for m in all_members if m.is_active]
            total_members = len(members)
            member_ids = [m.id for m in members if m.id]

            if not member_ids:
                club_summaries.append(ClubSummaryItem(
                    club_id=club.id,
                    club_name=club.name,
                    total_members=0,
                    members_with_license=0,
                    members_with_insurance=0,
                    total_collected=0.0,
                    has_club_fee=False,
                ))
                grand_total_members += total_members
                continue

            summary = await self.member_payment_repository.get_summary_by_member_ids(
                member_ids=member_ids,
                payment_year=payment_year
            )

            payments = await self.member_payment_repository.find_by_member_ids_year(
                member_ids=member_ids,
                payment_year=payment_year,
                status=MemberPaymentStatus.COMPLETED
            )

            license_members = set()
            insurance_members = set()
            has_club_fee = False
            for payment in payments:
                if payment.is_license_payment:
                    license_members.add(payment.member_id)
                if payment.is_insurance_payment:
                    insurance_members.add(payment.member_id)
                if payment.payment_type == MemberPaymentType.CUOTA_CLUB:
                    has_club_fee = True

            total_collected = summary.get("total_amount", 0.0)

            club_summaries.append(ClubSummaryItem(
                club_id=club.id,
                club_name=club.name,
                total_members=total_members,
                members_with_license=len(license_members),
                members_with_insurance=len(insurance_members),
                total_collected=total_collected,
                has_club_fee=has_club_fee,
            ))

            grand_total += total_collected
            grand_total_members += total_members

        return AllClubsPaymentSummaryResult(
            payment_year=payment_year,
            clubs=club_summaries,
            grand_total_collected=grand_total,
            grand_total_members=grand_total_members,
        )
