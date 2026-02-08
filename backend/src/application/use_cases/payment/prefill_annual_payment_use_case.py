"""Use case for pre-filling annual payment form with existing data."""

import json
from dataclasses import dataclass
from typing import List

from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.domain.entities.license import TechnicalGrade, InstructorCategory, AgeCategory
from src.domain.entities.insurance import InsuranceType
from src.domain.entities.payment import PaymentType, PaymentStatus


@dataclass
class PrefillMemberAssignment:
    member_id: str
    member_name: str
    payment_types: List[str]


@dataclass
class PrefillResult:
    payer_name: str
    include_club_fee: bool
    kyu_count: int
    kyu_infantil_count: int
    dan_count: int
    fukushidoin_shidoin_count: int
    seguro_accidentes_count: int
    seguro_rc_count: int
    member_assignments: List[PrefillMemberAssignment]
    source: str  # "members" or "previous_payment"


class PrefillAnnualPaymentUseCase:
    """Builds prefill data for the annual payment form.

    Priority: real member/license/insurance data first.
    Fallback: previous year's completed payment if no members found.
    """

    def __init__(
        self,
        member_repository: MemberRepositoryPort,
        license_repository: LicenseRepositoryPort,
        insurance_repository: InsuranceRepositoryPort,
        payment_repository: PaymentRepositoryPort,
    ):
        self._member_repo = member_repository
        self._license_repo = license_repository
        self._insurance_repo = insurance_repository
        self._payment_repo = payment_repository

    async def execute(
        self,
        club_id: str,
        payment_year: int,
        payer_name: str = "",
    ) -> PrefillResult:
        # 1. Get all active members for this club
        members = await self._member_repo.find_by_club_id(club_id, limit=500)
        active_members = [m for m in members if m.status.value == "active"]

        if not active_members:
            return await self._prefill_from_previous_payment(
                club_id, payment_year, payer_name
            )

        # 2. Get all licenses and insurances for these members
        member_ids = [m.id for m in active_members if m.id]
        licenses = await self._license_repo.find_by_member_ids(member_ids, limit=1000)
        insurances = await self._insurance_repo.find_by_member_ids(member_ids, limit=1000)

        # 3. Build a map of member_id -> best license (active preferred, then newest)
        member_license_map: dict = {}
        for lic in licenses:
            mid = lic.member_id
            if mid not in member_license_map:
                member_license_map[mid] = lic
            else:
                existing = member_license_map[mid]
                if lic.status.value == "active" and existing.status.value != "active":
                    member_license_map[mid] = lic
                elif lic.status.value == existing.status.value:
                    if lic.created_at and existing.created_at and lic.created_at > existing.created_at:
                        member_license_map[mid] = lic

        # 4. Build a map of member_id -> insurance type keys
        member_insurance_map: dict = {}
        for ins in insurances:
            mid = ins.member_id
            if mid not in member_insurance_map:
                member_insurance_map[mid] = set()
            if ins.insurance_type == InsuranceType.ACCIDENT:
                member_insurance_map[mid].add("seguro_accidentes")
            elif ins.insurance_type == InsuranceType.CIVIL_LIABILITY:
                member_insurance_map[mid].add("seguro_rc")

        # 5. Classify members and build counts + assignments
        counts = {
            "kyu": 0, "kyu_infantil": 0, "dan": 0,
            "fukushidoin_shidoin": 0, "seguro_accidentes": 0, "seguro_rc": 0,
        }
        assignments: List[PrefillMemberAssignment] = []

        for member in active_members:
            member_types: List[str] = []
            lic = member_license_map.get(member.id)

            if lic:
                if lic.instructor_category in (
                    InstructorCategory.FUKUSHIDOIN,
                    InstructorCategory.SHIDOIN,
                ):
                    member_types.append("fukushidoin_shidoin")
                    counts["fukushidoin_shidoin"] += 1
                elif lic.technical_grade == TechnicalGrade.DAN:
                    member_types.append("dan")
                    counts["dan"] += 1
                elif lic.technical_grade == TechnicalGrade.KYU:
                    if lic.age_category == AgeCategory.INFANTIL:
                        member_types.append("kyu_infantil")
                        counts["kyu_infantil"] += 1
                    else:
                        member_types.append("kyu")
                        counts["kyu"] += 1

            ins_types = member_insurance_map.get(member.id, set())
            for it in ins_types:
                member_types.append(it)
                counts[it] += 1

            if member_types:
                assignments.append(PrefillMemberAssignment(
                    member_id=member.id or "",
                    member_name=member.get_full_name(),
                    payment_types=member_types,
                ))

        # 6. Determine club fee
        existing_payment = await self._payment_repo.find_by_club_type_year(
            club_id, PaymentType.ANNUAL_QUOTA, payment_year
        )
        include_club_fee = not (
            existing_payment and existing_payment.status == PaymentStatus.COMPLETED
        )

        return PrefillResult(
            payer_name=payer_name,
            include_club_fee=include_club_fee,
            kyu_count=counts["kyu"],
            kyu_infantil_count=counts["kyu_infantil"],
            dan_count=counts["dan"],
            fukushidoin_shidoin_count=counts["fukushidoin_shidoin"],
            seguro_accidentes_count=counts["seguro_accidentes"],
            seguro_rc_count=counts["seguro_rc"],
            member_assignments=assignments,
            source="members",
        )

    async def _prefill_from_previous_payment(
        self,
        club_id: str,
        payment_year: int,
        payer_name: str,
    ) -> PrefillResult:
        """Fallback: use last year's completed payment."""
        prev_payment = await self._payment_repo.find_by_club_type_year(
            club_id, PaymentType.ANNUAL_QUOTA, payment_year - 1
        )

        if not prev_payment or prev_payment.status != PaymentStatus.COMPLETED:
            return PrefillResult(
                payer_name=payer_name,
                include_club_fee=True,
                kyu_count=0, kyu_infantil_count=0, dan_count=0,
                fukushidoin_shidoin_count=0, seguro_accidentes_count=0, seguro_rc_count=0,
                member_assignments=[],
                source="previous_payment",
            )

        counts = {
            "kyu": 0, "kyu_infantil": 0, "dan": 0,
            "fukushidoin_shidoin": 0, "seguro_accidentes": 0, "seguro_rc": 0,
        }
        if prev_payment.line_items_data:
            try:
                line_items = json.loads(prev_payment.line_items_data)
                for item in line_items:
                    item_type = item.get("item_type", "")
                    if item_type in counts:
                        counts[item_type] = item.get("quantity", 0)
            except (json.JSONDecodeError, TypeError):
                pass

        prev_assignments: List[PrefillMemberAssignment] = []
        if prev_payment.member_assignments:
            try:
                raw = json.loads(prev_payment.member_assignments)
                for a in raw:
                    prev_assignments.append(PrefillMemberAssignment(
                        member_id=a.get("member_id", ""),
                        member_name=a.get("member_name", ""),
                        payment_types=a.get("payment_types", []),
                    ))
            except (json.JSONDecodeError, TypeError):
                pass

        return PrefillResult(
            payer_name=prev_payment.payer_name or payer_name,
            include_club_fee=True,
            kyu_count=counts["kyu"],
            kyu_infantil_count=counts["kyu_infantil"],
            dan_count=counts["dan"],
            fukushidoin_shidoin_count=counts["fukushidoin_shidoin"],
            seguro_accidentes_count=counts["seguro_accidentes"],
            seguro_rc_count=counts["seguro_rc"],
            member_assignments=prev_assignments,
            source="previous_payment",
        )
