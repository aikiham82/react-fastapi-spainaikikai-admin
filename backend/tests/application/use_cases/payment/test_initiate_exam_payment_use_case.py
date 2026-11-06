"""Tests for InitiateExamPaymentUseCase: a card payment for one exam."""

import json
from datetime import date, datetime
from unittest.mock import AsyncMock

import pytest

from src.application.ports.redsys_service import RedsysPaymentFormData
from src.application.use_cases.payment.initiate_exam_payment_use_case import InitiateExamPaymentUseCase
from src.domain.entities.member import Member
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.payment import InvalidPaymentDataError, PaymentAlreadyExistsError

NOW = datetime(2026, 11, 6, 12, 0)
MEMBER = Member(id="m1", first_name="Lucía", last_name="Prueba", club_id="club1")
FORM = RedsysPaymentFormData(
    payment_url="https://bank.example.com/pay", ds_signature_version="HMAC_SHA256_V1",
    ds_merchant_parameters="params", ds_signature="sig",
)


def in_flight(member_id="m1", exam="examen_dan_2") -> Payment:
    return Payment(
        id="pay-old", member_id=member_id, club_id="club1", payment_type=PaymentType.EXAM_FEE,
        amount=175, status=PaymentStatus.PROCESSING, payment_year=2026,
        line_items_data=json.dumps([{"item_type": exam, "description": "x", "quantity": 1, "unit_price": 175}]),
    )


@pytest.fixture
def repos():
    payment_repo = AsyncMock()

    async def create(payment):
        payment.id = "pay-new"
        return payment

    payment_repo.create = AsyncMock(side_effect=create)
    payment_repo.update = AsyncMock(side_effect=lambda payment: payment)
    payment_repo.find_unfinished_exams = AsyncMock(return_value=[])
    member_repo = AsyncMock()
    member_repo.find_by_id = AsyncMock(return_value=MEMBER)
    price_repo = AsyncMock()
    price_repo.find_by_key = AsyncMock(
        side_effect=lambda key: PriceConfiguration(key=key, price=175, description=key, category="exam")
        if key == "examen_dan_2" else None
    )
    member_payment_repo = AsyncMock()
    member_payment_repo.exists_for_member_year_type = AsyncMock(return_value=False)
    redsys = AsyncMock()
    redsys.generate_order_id = lambda payment_id: "000123"
    redsys.create_payment_form_data = AsyncMock(return_value=FORM)
    return {"payment": payment_repo, "member": member_repo, "price": price_repo, "redsys": redsys, "member_payment": member_payment_repo}


async def _start(repos, exam="examen_dan_2"):
    return await InitiateExamPaymentUseCase(
        payment_repository=repos["payment"],
        member_payment_repository=repos["member_payment"],
        member_repository=repos["member"],
        price_configuration_repository=repos["price"],
        redsys_service=repos["redsys"],
        clock=lambda: NOW,
    ).execute(
        member_id="m1", exam=exam, exam_date=date(2026, 11, 14), venue="Madrid", payer_name="Club Prueba",
        success_url="https://admin.example.com/ok", failure_url="https://admin.example.com/ko",
        webhook_url="https://api.example.com/webhook",
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestInitiateExamPayment:

    async def test_starts_a_card_payment_for_the_exam_price(self, repos):
        result = await _start(repos)

        assert result.form_data == FORM
        assert result.order_id == "000123"
        payment = repos["payment"].update.await_args.args[0]
        assert payment.payment_type == PaymentType.EXAM_FEE
        assert payment.status == PaymentStatus.PROCESSING
        assert payment.transaction_id == "000123"
        assert payment.amount == 175
        assert payment.member_id == "m1"
        assert payment.club_id == "club1"
        request = repos["redsys"].create_payment_form_data.await_args.args[0]
        assert request.amount_cents == 17500
        assert request.description == "Examen 2.º Dan · 14/11/2026 · Madrid"

    async def test_the_same_exam_in_flight_is_refused_before_the_bank(self, repos):
        repos["payment"].find_unfinished_exams = AsyncMock(return_value=[in_flight()])

        with pytest.raises(PaymentAlreadyExistsError):
            await _start(repos)
        repos["payment"].create.assert_not_awaited()

    async def test_looks_for_payments_in_flight_in_the_last_twenty_minutes(self, repos):
        await _start(repos)

        member_id, since = repos["payment"].find_unfinished_exams.await_args.args
        assert member_id == "m1"
        assert since == datetime(2026, 11, 6, 11, 40)

    async def test_another_exam_in_flight_for_the_member_does_not_block(self, repos):
        repos["payment"].find_unfinished_exams = AsyncMock(return_value=[in_flight(exam="examen_dan_3")])

        result = await _start(repos)

        assert result.payment_id == "pay-new"

    async def test_an_exam_already_paid_this_year_never_reaches_the_bank(self, repos):
        repos["member_payment"].exists_for_member_year_type = AsyncMock(return_value=True)

        with pytest.raises(PaymentAlreadyExistsError):
            await _start(repos)
        repos["payment"].create.assert_not_awaited()

    async def test_a_missing_price_is_refused(self, repos):
        with pytest.raises(InvalidPaymentDataError):
            await _start(repos, exam="examen_dan_4")
        repos["payment"].create.assert_not_awaited()
