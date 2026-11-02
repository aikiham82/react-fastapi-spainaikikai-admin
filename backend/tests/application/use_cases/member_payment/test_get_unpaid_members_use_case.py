"""Without a payment type, a member is unpaid when no completed line pays a licence."""

from dataclasses import replace
from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.member_payment.get_unpaid_members_use_case import GetUnpaidMembersUseCase
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType

pytestmark = [pytest.mark.unit]

CLUB_ID = "club-dojo"
MEMBER = Member(id="member-ana", first_name="Ana", last_name="Example", club_id=CLUB_ID,
                registration_date=datetime(2020, 1, 1))
LICENCE_TYPES = [
    MemberPaymentType.LICENCIA_KYU,
    MemberPaymentType.LICENCIA_KYU_INFANTIL,
    MemberPaymentType.LICENCIA_DAN,
    MemberPaymentType.TITULO_FUKUSHIDOIN,
    MemberPaymentType.TITULO_SHIDOIN,
]
OTHER_TYPES = [
    MemberPaymentType.SEGURO_ACCIDENTES,
    MemberPaymentType.SEGURO_RC,
    MemberPaymentType.CUOTA_CLUB,
]


def paid(payment_type: MemberPaymentType) -> MemberPayment:
    return MemberPayment(
        id=f"mp-{payment_type.value}", payment_id="payment-1", member_id=MEMBER.id, payment_year=2026,
        payment_type=payment_type, amount=15, status=MemberPaymentStatus.COMPLETED,
    )


async def unpaid_count(
    payments: list[MemberPayment],
    payment_type: str | None = None,
    members: tuple[Member, ...] | list[Member] = (MEMBER,),
    year: int = 2026,
) -> int:
    use_case = GetUnpaidMembersUseCase(
        member_payment_repository=AsyncMock(find_by_member_ids_year=AsyncMock(return_value=payments)),
        member_repository=AsyncMock(find_by_club_id=AsyncMock(return_value=list(members))),
    )
    result = await use_case.execute(CLUB_ID, year, payment_type)
    return result.total_count


@pytest.mark.parametrize("payment_type", OTHER_TYPES, ids=lambda t: t.value)
async def test_a_member_who_paid_only_that_is_still_unpaid(payment_type):
    assert await unpaid_count([paid(payment_type)]) == 1


@pytest.mark.parametrize("payment_type", LICENCE_TYPES, ids=lambda t: t.value)
async def test_a_member_with_a_licence_or_title_is_paid(payment_type):
    assert await unpaid_count([paid(payment_type)]) == 0


async def test_a_member_with_nothing_paid_is_unpaid():
    assert await unpaid_count([]) == 1


@pytest.mark.parametrize(
    ("registration_date", "created_at", "expected"),
    [
        (datetime(2024, 12, 31), datetime(2026, 4, 17), 1),
        (datetime(2025, 1, 1), datetime(2026, 4, 17), 1),
        (datetime(2026, 1, 1), datetime(2026, 4, 17), 0),
        (None, datetime(2025, 6, 1), 1),
        (None, datetime(2026, 4, 17), 0),
    ],
    ids=["joined-before", "joined-that-year", "joined-after", "no-date-created-that-year", "no-date-created-after"],
)
async def test_a_member_is_listed_only_from_the_year_they_joined(registration_date, created_at, expected):
    member = replace(MEMBER, registration_date=registration_date, created_at=created_at)

    assert await unpaid_count([], members=[member], year=2025) == expected


async def test_asking_for_a_type_still_looks_at_that_type_only():
    payments = [paid(MemberPaymentType.SEGURO_ACCIDENTES)]

    assert await unpaid_count(payments, "seguro_accidentes") == 0
    assert await unpaid_count(payments, "licencia_kyu") == 1
