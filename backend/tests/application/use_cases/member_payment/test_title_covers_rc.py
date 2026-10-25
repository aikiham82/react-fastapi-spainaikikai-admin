"""A shidoin or fukushidoin title includes the RC insurance wherever paid status is derived."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.member_payment.get_club_payment_summary_use_case import GetClubPaymentSummaryUseCase
from src.application.use_cases.member_payment.get_member_payment_status_use_case import GetMemberPaymentStatusUseCase
from src.application.use_cases.member_payment.get_unpaid_members_use_case import GetUnpaidMembersUseCase
from src.domain.entities.club import Club
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType

pytestmark = [pytest.mark.unit]

CLUB = Club(id="club-dojo", name="Dojo Example", email="dojo@example.com")
SENSEI = Member(id="member-sensei", first_name="Ana", last_name="Example", club_id=CLUB.id,
                registration_date=datetime(2020, 1, 1))


def paid(payment_type: MemberPaymentType, amount: float) -> MemberPayment:
    return MemberPayment(
        id=f"mp-{payment_type.value}", payment_id="payment-1", member_id=SENSEI.id, payment_year=2026,
        payment_type=payment_type, amount=amount, status=MemberPaymentStatus.COMPLETED,
    )


BY_HAND = [paid(MemberPaymentType.TITULO_SHIDOIN, 70)]
THROUGH_REDSYS = [paid(MemberPaymentType.TITULO_SHIDOIN, 70), paid(MemberPaymentType.SEGURO_RC, 0)]


def repositories(payments):
    return SimpleNamespace(
        member_payment=SimpleNamespace(
            find_by_member_ids_year=AsyncMock(return_value=payments),
            find_by_member_year=AsyncMock(return_value=payments),
            get_summary_by_member_ids=AsyncMock(return_value={"total_amount": 70.0, "by_type": {}}),
        ),
        club=SimpleNamespace(find_by_id=AsyncMock(return_value=CLUB)),
        member=SimpleNamespace(find_by_club_id=AsyncMock(return_value=[SENSEI]),
                               find_by_id=AsyncMock(return_value=SENSEI)),
        license=SimpleNamespace(find_by_member_ids=AsyncMock(return_value=[])),
    )


@pytest.mark.parametrize("payments", [BY_HAND, THROUGH_REDSYS], ids=["by hand", "through redsys"])
async def test_a_title_counts_as_insurance_paid_in_the_club_summary(payments):
    repos = repositories(payments)

    summary = await GetClubPaymentSummaryUseCase(
        repos.member_payment, repos.club, repos.member, repos.license
    ).execute(CLUB.id, 2026)

    assert (summary.members_with_insurance, summary.members[0].insurance_paid) == (1, True)


async def test_a_title_registered_by_hand_counts_as_rc_paid_in_the_member_status():
    repos = repositories(BY_HAND)

    status = await GetMemberPaymentStatusUseCase(repos.member_payment, repos.member).execute(SENSEI.id, 2026)

    rc = next(s for s in status.payment_statuses if s.payment_type == "seguro_rc")
    accident = next(s for s in status.payment_statuses if s.payment_type == "seguro_accidentes")
    assert (rc.is_paid, accident.is_paid, status.total_paid) == (True, False, 70)


async def test_a_title_registered_by_hand_is_not_unpaid_rc():
    repos = repositories(BY_HAND)

    result = await GetUnpaidMembersUseCase(repos.member_payment, repos.member).execute(CLUB.id, 2026, "seguro_rc")

    assert result.total_count == 0


async def test_a_title_with_its_redsys_rc_line_is_counted_once():
    repos = repositories(THROUGH_REDSYS)

    status = await GetMemberPaymentStatusUseCase(repos.member_payment, repos.member).execute(SENSEI.id, 2026)

    assert status.total_paid == 70
    assert [s.payment_type for s in status.payment_statuses].count("seguro_rc") == 1
