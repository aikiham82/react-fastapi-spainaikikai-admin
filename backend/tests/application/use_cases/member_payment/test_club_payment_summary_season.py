"""The current year shows licences of that year and the insurance in force today."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.member_payment.get_all_clubs_payment_summary_use_case import (
    GetAllClubsPaymentSummaryUseCase,
)
from src.application.use_cases.member_payment.get_club_member_payments_use_case import (
    GetClubMemberPaymentsUseCase,
)
from src.application.use_cases.member_payment.get_club_payment_summary_use_case import (
    GetClubPaymentSummaryUseCase,
)
from src.domain.entities.club import Club
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType

pytestmark = [pytest.mark.unit]

CLUB = Club(id="club-dojo", name="Dojo Example", email="dojo@example.com")
ANA = Member(id="member-ana", first_name="Ana", last_name="Example", club_id=CLUB.id,
             registration_date=datetime(2020, 1, 1))
LUIS = Member(id="member-luis", first_name="Luis", last_name="Example", club_id=CLUB.id,
              registration_date=datetime(2020, 1, 1))
OCTOBER = datetime(2026, 10, 25)
SEPTEMBER = datetime(2026, 9, 30)


def paid(member: Member, payment_type: MemberPaymentType, year: int, amount: float) -> MemberPayment:
    return MemberPayment(
        id=f"{member.id}-{payment_type.value}-{year}", payment_id="payment", member_id=member.id,
        payment_year=year, payment_type=payment_type, amount=amount, status=MemberPaymentStatus.COMPLETED,
    )


PAYMENTS = [
    paid(ANA, MemberPaymentType.SEGURO_ACCIDENTES, 2025, 15),
    paid(ANA, MemberPaymentType.SEGURO_ACCIDENTES, 2026, 15),
    paid(ANA, MemberPaymentType.SEGURO_ACCIDENTES, 2027, 20),
    paid(LUIS, MemberPaymentType.LICENCIA_KYU, 2026, 15),
]


def payments_of_year(member_ids, payment_year, status=None, limit=0):
    return [p for p in PAYMENTS if p.member_id in member_ids and p.payment_year == payment_year]


@pytest.fixture
def repositories():
    return SimpleNamespace(
        member_payment=SimpleNamespace(find_by_member_ids_year=AsyncMock(side_effect=payments_of_year)),
        club=SimpleNamespace(find_by_id=AsyncMock(return_value=CLUB), find_all=AsyncMock(return_value=[CLUB])),
        member=SimpleNamespace(find_by_club_id=AsyncMock(return_value=[ANA, LUIS])),
        license=SimpleNamespace(find_by_member_ids=AsyncMock(return_value=[])),
    )


async def club_summary(repositories, payment_year, today):
    use_case = GetClubPaymentSummaryUseCase(
        repositories.member_payment, repositories.club, repositories.member, repositories.license
    )
    return await use_case.execute(CLUB.id, payment_year, today=today)


def paid_marks(summary):
    return {m.member_id: (m.license_paid, m.insurance_paid, m.total_paid) for m in summary.members}


async def test_the_current_year_shows_the_insurance_in_force_from_october(repositories):
    summary = await club_summary(repositories, 2026, OCTOBER)

    assert paid_marks(summary) == {ANA.id: (False, True, 20), LUIS.id: (True, False, 15)}
    assert summary.total_collected == 35


async def test_the_current_year_shows_its_own_insurance_until_september(repositories):
    summary = await club_summary(repositories, 2026, SEPTEMBER)

    assert paid_marks(summary)[ANA.id] == (False, True, 15)
    assert summary.total_collected == 30


async def test_a_past_year_shows_its_own_insurance(repositories):
    summary = await club_summary(repositories, 2025, OCTOBER)

    assert paid_marks(summary)[ANA.id] == (False, True, 15)


async def test_the_all_clubs_summary_counts_the_insurance_in_force(repositories):
    use_case = GetAllClubsPaymentSummaryUseCase(
        repositories.member_payment, repositories.club, repositories.member
    )

    result = await use_case.execute(2026, today=OCTOBER)

    club = result.clubs[0]
    assert (club.members_with_license, club.members_with_insurance, club.total_collected) == (1, 1, 35)


async def test_the_member_payment_list_shows_the_insurance_in_force(repositories):
    use_case = GetClubMemberPaymentsUseCase(repositories.member_payment, repositories.member)

    rows = await use_case.execute(CLUB.id, 2026, today=OCTOBER)

    assert sorted((r.payment.payment_type.value, r.payment.payment_year) for r in rows) == [
        ("licencia_kyu", 2026), ("seguro_accidentes", 2027),
    ]
