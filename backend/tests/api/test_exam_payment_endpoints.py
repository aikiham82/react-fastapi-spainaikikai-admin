"""Who registers an exam fee, and what the exam prices endpoint returns."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.domain.entities.price_configuration import PriceConfiguration
from src.application.ports.redsys_service import RedsysPaymentFormData
from src.domain.exceptions.payment import InvalidPaymentDataError, PaymentAlreadyExistsError
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_member_repository,
    get_price_configuration_repository,
    get_initiate_exam_payment_use_case,
    get_register_manual_exam_payment_use_case,
)
from src.infrastructure.web.routers.payments import router as payments_router
from src.infrastructure.web.routers.price_configurations import router as prices_router
from tests.api.callers import FOREIGN_MEMBER, OWN_CLUB, OWN_MEMBER, MembersByClub, club_admin, plain_member, super_admin

pytestmark = [pytest.mark.api, pytest.mark.auth]

PAID = Payment(
    id="pay-exam", club_id=OWN_CLUB, member_id=OWN_MEMBER, payment_type=PaymentType.EXAM_FEE,
    payment_method=PaymentMethod.TRANSFER, amount=175, status=PaymentStatus.COMPLETED, payment_year=2026,
)
LINE = MemberPayment(
    id="mp-exam", payment_id="pay-exam", member_id=OWN_MEMBER, payment_year=2026,
    payment_type=MemberPaymentType.EXAMEN_DAN_2, concept="Examen 2.º Dan · 14/11/2026 · Madrid",
    amount=175, status=MemberPaymentStatus.COMPLETED,
)
PRICES = {
    "examen_dan_2": PriceConfiguration(id="p2", key="examen_dan_2", price=175, description="Examen 2.º Dan", category="exam"),
    "examen_dan_3": PriceConfiguration(id="p3", key="examen_dan_3", price=250, description="Examen 3.er Dan", category="exam", is_active=False),
}


@pytest.fixture
def exam_use_case():
    return AsyncMock(**{"execute.return_value": SimpleNamespace(payment=PAID, member_payment=LINE, invoice=None)})


@pytest.fixture
def card_use_case():
    form = RedsysPaymentFormData(
        payment_url="https://bank.example.com/pay", ds_signature_version="HMAC_SHA256_V1",
        ds_merchant_parameters="params", ds_signature="sig",
    )
    return AsyncMock(**{"execute.return_value": SimpleNamespace(payment_id="pay-card", order_id="000123", form_data=form)})


@pytest.fixture
def client_as(exam_use_case, card_use_case):
    def build(ctx) -> TestClient:
        app = FastAPI()
        app.include_router(payments_router, prefix="/api/v1")
        app.include_router(prices_router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_register_manual_exam_payment_use_case: lambda: exam_use_case,
            get_initiate_exam_payment_use_case: lambda: card_use_case,
            get_price_configuration_repository: lambda: SimpleNamespace(find_by_key=AsyncMock(side_effect=PRICES.get)),
        }
        return TestClient(app)

    return build


def body(member_id: str = OWN_MEMBER, **changes) -> dict:
    return {
        "member_id": member_id, "exam": "examen_dan_2", "exam_date": "2026-11-14", "venue": "Madrid",
        "payer_name": "Club Example", "payment_method": "transfer", **changes,
    }


def test_super_admin_registers_an_exam_for_any_member(client_as, exam_use_case):
    response = client_as(super_admin()).post("/api/v1/payments/exam", json=body(FOREIGN_MEMBER))

    assert response.status_code == 201
    assert response.json()["payment"]["payment_type"] == "exam_fee"
    exam_use_case.execute.assert_awaited_once()


def test_club_admin_registers_an_exam_for_a_member_of_their_club(client_as, exam_use_case):
    response = client_as(club_admin()).post("/api/v1/payments/exam", json=body())

    assert response.status_code == 201
    kwargs = exam_use_case.execute.await_args.kwargs
    assert kwargs["exam"] == "examen_dan_2"
    assert kwargs["venue"] == "Madrid"
    assert str(kwargs["exam_date"]) == "2026-11-14"


def test_club_admin_cannot_register_an_exam_for_another_clubs_member(client_as, exam_use_case):
    response = client_as(club_admin()).post("/api/v1/payments/exam", json=body(FOREIGN_MEMBER))

    assert response.status_code == 403
    exam_use_case.execute.assert_not_awaited()


def test_a_plain_member_cannot_register_a_manual_exam(client_as, exam_use_case):
    response = client_as(plain_member()).post("/api/v1/payments/exam", json=body())

    assert response.status_code == 403
    exam_use_case.execute.assert_not_awaited()


@pytest.mark.parametrize("changes", [
    {"exam": "examen_dan_9"},
    {"venue": "   "},
    {"venue": "x" * 201},
    {"payment_method": "redsys"},
    {"exam_date": "no es fecha"},
])
def test_an_invalid_exam_request_is_refused(client_as, exam_use_case, changes):
    response = client_as(super_admin()).post("/api/v1/payments/exam", json=body(**changes))

    assert response.status_code == 422
    exam_use_case.execute.assert_not_awaited()


def test_a_missing_price_answers_400(client_as, exam_use_case):
    exam_use_case.execute.side_effect = InvalidPaymentDataError("Falta el precio de Examen 2.º Dan")

    response = client_as(super_admin()).post("/api/v1/payments/exam", json=body())

    assert response.status_code == 400
    assert response.json()["detail"] == "Falta el precio de Examen 2.º Dan"


def test_exam_prices_lists_only_the_active_configured_exams(client_as):
    response = client_as(club_admin()).get("/api/v1/price-configurations/exam-prices")

    assert response.status_code == 200
    assert [(p["key"], p["price"]) for p in response.json()] == [("examen_dan_2", 175)]


def card_body(member_id: str = OWN_MEMBER) -> dict:
    return {k: v for k, v in body(member_id).items() if k != "payment_method"}


def test_club_admin_starts_a_card_payment_for_a_member_of_their_club(client_as, card_use_case):
    response = client_as(club_admin()).post("/api/v1/payments/exam/initiate", json=card_body())

    assert response.status_code == 200
    assert response.json()["ds_signature"] == "sig"
    assert response.json()["payment_url"] == "https://bank.example.com/pay"
    kwargs = card_use_case.execute.await_args.kwargs
    assert kwargs["member_id"] == OWN_MEMBER
    assert kwargs["webhook_url"].endswith("/api/v1/payments/webhook")


def test_club_admin_cannot_start_a_card_payment_for_another_clubs_member(client_as, card_use_case):
    response = client_as(club_admin()).post("/api/v1/payments/exam/initiate", json=card_body(FOREIGN_MEMBER))

    assert response.status_code == 403
    card_use_case.execute.assert_not_awaited()


def test_a_card_exam_already_in_flight_answers_409(client_as, card_use_case):
    card_use_case.execute.side_effect = PaymentAlreadyExistsError("Ya hay un pago con tarjeta en curso para este examen.")

    response = client_as(super_admin()).post("/api/v1/payments/exam/initiate", json=card_body())

    assert response.status_code == 409
