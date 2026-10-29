"""A super admin confirms a payment that never finished online."""

import json
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.payment.complete_payment_use_case import CompletePaymentUseCase
from src.application.use_cases.payment.confirm_payment_received_use_case import (
    ConfirmPaymentReceivedUseCase,
)
from src.domain.entities.club import Club
from src.domain.entities.member import Member
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.domain.entities.seminar import Seminar
from src.domain.exceptions.payment import (
    DuplicatePaymentForYearError,
    InvalidPaymentDataError,
    InvalidPaymentStatusError,
    PaymentNotFoundError,
)


def unfinished_annual_payment(status=PaymentStatus.PROCESSING):
    return Payment(
        id="pay1", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA,
        payment_method=PaymentMethod.REDSYS, amount=20.0, status=status,
        payment_year=2026, payer_name="Example Dojo",
        line_items_data=json.dumps([{"description": "Licencia KYU", "quantity": 1, "unit_price": 20.0}]),
        member_assignments=json.dumps([
            {"member_id": "m1", "member_name": "Ana Example", "payment_types": ["kyu"]},
        ]),
    )


@pytest.fixture
def repos():
    repos = {name: AsyncMock() for name in (
        "payment", "invoice", "license", "insurance", "member",
        "member_payment", "email", "price", "seminar", "club",
    )}
    repos["payment"].find_by_id = AsyncMock(return_value=unfinished_annual_payment())
    repos["payment"].update = AsyncMock(side_effect=lambda payment: payment)
    repos["payment"].claim_unfinished = AsyncMock(return_value=True)
    repos["member_payment"].exists_for_member_year_type = AsyncMock(return_value=False)
    repos["invoice"].get_next_invoice_number = AsyncMock(return_value="2026-000050")
    repos["invoice"].create = AsyncMock(side_effect=lambda invoice: invoice)
    repos["member"].find_by_id = AsyncMock(return_value=Member(id="m1", first_name="Ana", last_name="Example"))
    repos["member_payment"].create_bulk = AsyncMock(side_effect=lambda lines: lines)
    repos["license"].find_active_by_member_year = AsyncMock(return_value=None)
    repos["license"].find_by_member_id = AsyncMock(return_value=[])
    repos["license"].count_by_license_number_prefix = AsyncMock(return_value=0)
    repos["license"].create = AsyncMock(side_effect=lambda licence: licence)
    repos["insurance"].find_active_by_member_year_type = AsyncMock(return_value=None)
    repos["insurance"].create = AsyncMock(side_effect=lambda insurance: insurance)
    repos["price"].find_by_key = AsyncMock(return_value=None)
    repos["club"].find_by_id = AsyncMock(return_value=Club(id="club1", name="Example Dojo", email="dojo@example.com"))
    return repos


@pytest.fixture
def use_case(repos):
    return ConfirmPaymentReceivedUseCase(repos["payment"], repos["member_payment"], CompletePaymentUseCase(
        payment_repository=repos["payment"],
        invoice_repository=repos["invoice"],
        license_repository=repos["license"],
        insurance_repository=repos["insurance"],
        member_repository=repos["member"],
        member_payment_repository=repos["member_payment"],
        email_service=repos["email"],
        price_configuration_repository=repos["price"],
        seminar_repository=repos["seminar"],
        club_repository=repos["club"],
    ))


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_confirmed_annual_payment_is_fulfilled_like_a_card_payment(use_case, repos):
    completed = await use_case.execute(payment_id="pay1", payment_method="transfer")

    assert completed.payment.status == PaymentStatus.COMPLETED
    assert completed.payment.payment_method == PaymentMethod.TRANSFER
    assert completed.payment.payment_date is not None
    lines = repos["member_payment"].create_bulk.call_args[0][0]
    assert [(line.member_id, line.payment_type.value) for line in lines] == [("m1", "licencia_kyu")]
    repos["license"].create.assert_called_once()
    assert completed.invoice.payment_method == "transfer"
    assert completed.invoice.customer_name == "Example Dojo"
    assert repos["email"].send_payment_confirmation.call_args.kwargs["to_email"] == "dojo@example.com"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_confirmed_oficialidad_makes_the_seminar_official(use_case, repos):
    seminar = Seminar(id="sem1", title="Example Seminar", instructor_name="Example Sensei",
                      venue="Example Hall", address="Calle Mayor 1", city="Madrid")
    repos["seminar"].find_by_id = AsyncMock(return_value=seminar)
    repos["payment"].find_by_id = AsyncMock(return_value=Payment(
        id="pay2", club_id="club1", payment_type=PaymentType.SEMINAR_OFICIALIDAD,
        amount=20.0, status=PaymentStatus.PROCESSING, related_entity_id="sem1", payment_year=2026,
    ))

    await use_case.execute(payment_id="pay2", payment_method="cash")

    assert seminar.is_official
    repos["seminar"].update.assert_called_once_with(seminar)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_completed_payment_cannot_be_confirmed_again(use_case, repos):
    repos["payment"].find_by_id = AsyncMock(return_value=unfinished_annual_payment(PaymentStatus.COMPLETED))

    with pytest.raises(InvalidPaymentStatusError):
        await use_case.execute(payment_id="pay1", payment_method="transfer")

    repos["invoice"].create.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize("method", ["redsys", "bitcoin"])
async def test_only_an_offline_method_can_confirm_a_payment(use_case, method):
    with pytest.raises(InvalidPaymentDataError):
        await use_case.execute(payment_id="pay1", payment_method=method)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_unknown_payment_is_not_found(use_case, repos):
    repos["payment"].find_by_id = AsyncMock(return_value=None)

    with pytest.raises(PaymentNotFoundError):
        await use_case.execute(payment_id="missing", payment_method="transfer")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_abandoned_attempt_already_paid_by_a_later_one_is_refused(use_case, repos):
    repos["member_payment"].exists_for_member_year_type = AsyncMock(return_value=True)

    with pytest.raises(DuplicatePaymentForYearError):
        await use_case.execute(payment_id="pay1", payment_method="transfer")

    repos["payment"].claim_unfinished.assert_not_called()
    repos["invoice"].create.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_payment_completed_meanwhile_is_not_fulfilled_twice(use_case, repos):
    repos["payment"].claim_unfinished = AsyncMock(return_value=False)

    with pytest.raises(InvalidPaymentStatusError):
        await use_case.execute(payment_id="pay1", payment_method="transfer")

    repos["member_payment"].create_bulk.assert_not_called()
    repos["invoice"].create.assert_not_called()
