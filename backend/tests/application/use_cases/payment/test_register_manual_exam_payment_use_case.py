"""Tests for RegisterManualExamPaymentUseCase."""

from datetime import date
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.payment.register_manual_exam_payment_use_case import (
    RegisterManualExamPaymentUseCase,
    exam_line_description,
)
from src.domain.entities.invoice import Invoice
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import PaymentMethod, PaymentStatus, PaymentType
from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.payment import InvalidPaymentDataError

EXAM_PRICES = {
    "examen_dan_1_hombu": 110.0,
    "examen_dan_1": 165.0,
    "examen_dan_2": 175.0,
    "examen_dan_3": 250.0,
    "examen_dan_4": 330.0,
    "examen_dan_5": 450.0,
    "examen_dan_6": 515.0,
}

MEMBER = Member(id="m1", first_name="Lucía", last_name="Prueba", club_id="club1", email="lucia@example.com")


def _price_repo(prices=EXAM_PRICES):
    repo = AsyncMock()

    async def find_by_key(key):
        if key not in prices:
            return None
        return PriceConfiguration(id=f"p-{key}", key=key, price=prices[key], description=key, category="exam")

    repo.find_by_key = AsyncMock(side_effect=find_by_key)
    return repo


@pytest.fixture
def repos():
    payment_repo = AsyncMock()

    async def create_payment(payment):
        payment.id = "pay1"
        return payment

    payment_repo.create = AsyncMock(side_effect=create_payment)
    member_payment_repo = AsyncMock()
    member_payment_repo.create_bulk = AsyncMock(side_effect=lambda lines: lines)
    invoice_repo = AsyncMock()
    invoice_repo.get_next_invoice_number = AsyncMock(return_value="2026-000001")
    invoice_repo.create = AsyncMock(side_effect=lambda invoice: invoice)
    member_repo = AsyncMock()
    member_repo.find_by_id = AsyncMock(return_value=MEMBER)
    return {
        "payment": payment_repo,
        "member_payment": member_payment_repo,
        "invoice": invoice_repo,
        "member": member_repo,
        "price": _price_repo(),
    }


def _use_case(repos):
    return RegisterManualExamPaymentUseCase(
        payment_repository=repos["payment"],
        member_payment_repository=repos["member_payment"],
        invoice_repository=repos["invoice"],
        member_repository=repos["member"],
        price_configuration_repository=repos["price"],
    )


async def _pay(repos, exam="examen_dan_2", payment_method="transfer"):
    return await _use_case(repos).execute(
        member_id="m1",
        exam=exam,
        exam_date=date(2026, 11, 14),
        venue="Madrid",
        payer_name="Club Prueba",
        payment_method=payment_method,
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestRegisterManualExamPayment:

    @pytest.mark.parametrize("exam,price", list(EXAM_PRICES.items()))
    async def test_each_exam_is_charged_its_configured_price(self, repos, exam, price):
        result = await _pay(repos, exam=exam)

        assert result.payment.amount == price
        assert result.member_payment.amount == price
        assert result.member_payment.payment_type == MemberPaymentType(exam)

    async def test_the_payment_is_a_paid_exam_fee_of_the_members_club(self, repos):
        result = await _pay(repos, payment_method="cash")

        payment = result.payment
        assert payment.payment_type == PaymentType.EXAM_FEE
        assert payment.status == PaymentStatus.COMPLETED
        assert payment.payment_method == PaymentMethod.CASH
        assert payment.club_id == "club1"
        assert payment.member_id == "m1"
        assert payment.payment_year == 2026

    async def test_the_member_line_is_completed_for_the_exam_year(self, repos):
        result = await _pay(repos)

        line = result.member_payment
        assert line.status == MemberPaymentStatus.COMPLETED
        assert line.payment_year == 2026
        assert line.member_id == "m1"
        assert line.payment_id == "pay1"

    async def test_the_invoice_line_names_grade_date_and_venue(self, repos):
        result = await _pay(repos)

        assert isinstance(result.invoice, Invoice)
        [line] = result.invoice.line_items
        assert line.description == "Examen 2.º Dan · 14/11/2026 · Madrid"
        assert line.unit_price == 175.0

    async def test_a_missing_price_refuses_the_payment(self, repos):
        repos["price"] = _price_repo({})

        with pytest.raises(InvalidPaymentDataError):
            await _pay(repos)
        repos["payment"].create.assert_not_awaited()

    async def test_an_unknown_exam_is_refused(self, repos):
        with pytest.raises(InvalidPaymentDataError):
            await _pay(repos, exam="examen_dan_9")

    async def test_an_unknown_member_is_refused(self, repos):
        repos["member"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(InvalidPaymentDataError):
            await _pay(repos)

    async def test_card_is_not_a_manual_method(self, repos):
        with pytest.raises(InvalidPaymentDataError):
            await _pay(repos, payment_method="redsys")


@pytest.mark.unit
def test_first_dan_descriptions_tell_whether_the_member_has_a_hombu_number():
    assert exam_line_description("examen_dan_1_hombu", date(2026, 4, 5), "Almería") == (
        "Examen 1.er Dan (con nº Hombu) · 05/04/2026 · Almería"
    )
    assert exam_line_description("examen_dan_1", date(2026, 4, 5), "Almería") == (
        "Examen 1.er Dan (sin nº Hombu) · 05/04/2026 · Almería"
    )
