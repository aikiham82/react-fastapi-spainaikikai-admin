"""Two card payments cannot charge an item twice; if the bank does, the data stays clean and someone is told."""

import json
import logging
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.payment.complete_payment_use_case import CompletePaymentUseCase
from src.application.use_cases.payment.initiate_annual_payment_use_case import (
    InitiateAnnualPaymentUseCase,
    MemberAssignment,
)
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]

NOW = datetime(2026, 11, 4, 12, 0, 0)


def payment_in_flight(items, year=2027, line_items=()):
    return Payment(
        id="payment-open", club_id="club-1", payment_type=PaymentType.ANNUAL_QUOTA, amount=15.0,
        status=PaymentStatus.PROCESSING, payment_year=year, line_items_data=json.dumps(list(line_items)),
        member_assignments=json.dumps([{"member_id": "member-1", "member_name": "Ana Example", "payment_types": items}]),
    )


def initiate_use_case(in_flight):
    price_repository = AsyncMock()
    price_repository.find_by_keys.side_effect = lambda keys: [MagicMock(key=k, price=20.0, description=k) for k in keys]
    payment_repository = AsyncMock()
    payment_repository.find_unfinished_annual.return_value = in_flight
    payment_repository.create.side_effect = lambda payment: payment
    redsys_service = MagicMock()
    redsys_service.generate_order_id.return_value = "order-1"
    redsys_service.create_payment_form_data = AsyncMock(return_value=MagicMock())
    member_payment_repository = AsyncMock()
    member_payment_repository.find_by_member_ids_year.return_value = []
    use_case = InitiateAnnualPaymentUseCase(
        payment_repository=payment_repository,
        redsys_service=redsys_service,
        price_repository=price_repository,
        member_payment_repository=member_payment_repository,
        clock=lambda: NOW,
    )
    return use_case, payment_repository


async def start(use_case, item="kyu", member_id="member-1", year=2027, club_fee=False):
    count = {"kyu": "kyu_count", "dan": "dan_count", "seguro_rc": "seguro_rc_count"}[item]
    return await use_case.execute(
        payer_name="Example Club", club_id="club-1", payment_year=year, include_club_fee=club_fee,
        member_assignments=[MemberAssignment(member_id, "Bea Example", [item])], **{count: 1},
    )


async def test_the_same_member_and_item_in_flight_is_refused_before_the_bank():
    use_case, payments = initiate_use_case([payment_in_flight(["kyu"])])

    with pytest.raises(ValueError, match="Ya hay un pago con tarjeta en curso para Bea Example"):
        await start(use_case)

    payments.create.assert_not_awaited()


@pytest.mark.parametrize(
    ("item", "member_id", "year"),
    [("dan", "member-1", 2027), ("kyu", "member-2", 2027), ("kyu", "member-1", 2026)],
    ids=["another item", "another member", "a licence of another year"],
)
async def test_anything_else_goes_on(item, member_id, year):
    use_case, payments = initiate_use_case([payment_in_flight(["kyu"])])

    await start(use_case, item, member_id, year)

    payments.create.assert_awaited_once()


async def test_an_insurance_in_flight_counts_whatever_year_the_form_says():
    use_case, _ = initiate_use_case([payment_in_flight(["seguro_rc"], year=2026)])

    with pytest.raises(ValueError, match="pago con tarjeta en curso"):
        await start(use_case, "seguro_rc", year=2027)


async def test_the_club_fee_in_flight_is_refused():
    use_case, _ = initiate_use_case([payment_in_flight(["dan"], line_items=[{"item_type": "club_fee"}])])

    with pytest.raises(ValueError, match="pago con tarjeta en curso"):
        await start(use_case, "kyu", club_fee=True)


async def test_it_looks_back_twenty_minutes_in_the_same_club():
    use_case, payments = initiate_use_case([])

    await start(use_case)

    payments.find_unfinished_annual.assert_awaited_once_with("club-1", NOW - timedelta(minutes=20))


async def test_a_new_payment_is_dated_by_the_same_clock():
    use_case, payments = initiate_use_case([])

    await start(use_case)

    assert payments.create.await_args.args[0].created_at == NOW


def completed_line(payment_type, year=2027, status=MemberPaymentStatus.COMPLETED):
    return MemberPayment(
        id="line-paid", payment_id="payment-first", member_id="member-1", payment_year=year,
        payment_type=payment_type, concept="line", amount=15, status=status,
    )


def complete_use_case(already):
    member_repository = AsyncMock()
    member_repository.find_by_id.return_value = MagicMock(club_role="member")
    lines = AsyncMock()
    lines.find_by_member_ids_year.side_effect = lambda ids, year, status=None: [
        line for line in already if line.payment_year == year and line.status == status
    ]
    use_case = CompletePaymentUseCase(
        payment_repository=MagicMock(), member_payment_repository=lines, member_repository=member_repository,
    )
    return use_case, lines


def second_payment():
    return Payment(
        id="payment-second", club_id="club-1", payment_type=PaymentType.ANNUAL_QUOTA, amount=35.0,
        status=PaymentStatus.COMPLETED, payment_year=2027,
        member_assignments=json.dumps([
            {"member_id": "member-1", "member_name": "Ana Example", "payment_types": ["kyu", "dan"]},
        ]),
    )


async def test_a_line_already_paid_is_skipped_and_reported_with_ids_only(caplog):
    use_case, lines = complete_use_case([completed_line(MemberPaymentType.LICENCIA_KYU)])

    with caplog.at_level(logging.ERROR):
        created = await use_case._create_member_payments(second_payment(), NOW)

    assert [line.payment_type for line in created] == [MemberPaymentType.LICENCIA_DAN]
    assert [line.payment_type for line in lines.create_bulk.await_args.args[0]] == [MemberPaymentType.LICENCIA_DAN]
    report = [record.getMessage() for record in caplog.records if record.levelno == logging.ERROR]
    assert len(report) == 1
    assert "payment-second" in report[0] and "member-1" in report[0] and "licencia_kyu" in report[0]
    assert "Ana" not in report[0]


async def test_nothing_is_reported_when_nothing_was_paid_twice(caplog):
    use_case, lines = complete_use_case([])

    with caplog.at_level(logging.ERROR):
        created = await use_case._create_member_payments(second_payment(), NOW)

    assert len(created) == 2
    assert not [record for record in caplog.records if record.levelno == logging.ERROR]


async def test_a_pending_line_does_not_stop_a_paid_one():
    use_case, _ = complete_use_case([completed_line(MemberPaymentType.LICENCIA_KYU, status=MemberPaymentStatus.PENDING)])

    created = await use_case._create_member_payments(second_payment(), NOW)

    assert len(created) == 2


async def test_a_line_paid_for_another_year_does_not_count():
    use_case, _ = complete_use_case([completed_line(MemberPaymentType.LICENCIA_KYU, year=2026)])

    created = await use_case._create_member_payments(second_payment(), NOW)

    assert len(created) == 2
