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
    get_payment_repository,
    get_register_manual_exam_payment_use_case,
)
from src.infrastructure.web.redsys_redirect import make_redirect_token
from src.infrastructure.web.routers.payments import public_router as payments_public_router
from src.infrastructure.web.routers.payments import router as payments_router
from src.infrastructure.web.routers.payments import self_service_router as payments_self_service_router
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


def card_payment(payment_id: str, payment_status: PaymentStatus) -> Payment:
    return Payment(
        id=payment_id, club_id=OWN_CLUB, member_id=OWN_MEMBER, payment_type=PaymentType.EXAM_FEE,
        payment_method=PaymentMethod.REDSYS, amount=175, status=payment_status, payment_year=2026,
    )


PAYMENTS = {
    "pay-card": card_payment("pay-card", PaymentStatus.PROCESSING),
    "pay-done": card_payment("pay-done", PaymentStatus.COMPLETED),
}
FORM_FIELDS = {
    "payment_url": "https://bank.example.com/pay", "ds_signature_version": "HMAC_SHA256_V1",
    "ds_merchant_parameters": "params\"><script>", "ds_signature": "sig",
}


async def active_prices(keys):
    return [PRICES[key] for key in keys if key in PRICES and PRICES[key].is_active]


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
        app.include_router(payments_public_router, prefix="/api/v1")
        app.include_router(payments_self_service_router, prefix="/api/v1")
        app.include_router(payments_router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_register_manual_exam_payment_use_case: lambda: exam_use_case,
            get_initiate_exam_payment_use_case: lambda: card_use_case,
            get_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(side_effect=PAYMENTS.get)),
            get_price_configuration_repository: lambda: SimpleNamespace(find_by_keys=AsyncMock(side_effect=active_prices)),
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
    {"exam_date": "0202-11-14"},
    {"exam_date": "2099-01-01"},
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
    response = client_as(club_admin()).get("/api/v1/payments/exam-prices")

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


def test_a_member_starts_a_card_payment_for_their_own_exam(client_as, card_use_case):
    response = client_as(plain_member(OWN_MEMBER)).post("/api/v1/payments/exam/initiate", json=card_body())

    assert response.status_code == 200
    assert "/api/v1/payments/pay-card/redsys-redirect?token=" in response.json()["redirect_url"]
    card_use_case.execute.assert_awaited_once()


def test_a_member_cannot_start_a_card_payment_for_someone_else(client_as, card_use_case):
    response = client_as(plain_member(OWN_MEMBER)).post("/api/v1/payments/exam/initiate", json=card_body(FOREIGN_MEMBER))

    assert response.status_code == 403
    card_use_case.execute.assert_not_awaited()


def test_the_redirect_page_posts_the_signed_form_to_the_bank(client_as):
    token = make_redirect_token("pay-card", FORM_FIELDS)

    response = client_as(super_admin()).get(f"/api/v1/payments/pay-card/redsys-redirect?token={token}")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    html = response.text
    assert 'action="https://bank.example.com/pay"' in html
    assert 'name="Ds_Signature" value="sig"' in html
    assert "<script>" not in html.split("</form>")[0].split("Ds_MerchantParameters")[1]
    assert ".submit()" in html


@pytest.mark.parametrize("payment_id,token", [
    ("pay-card", "not-a-token"),
    ("pay-card", make_redirect_token("pay-other", FORM_FIELDS)),
    ("pay-card", make_redirect_token("pay-card", FORM_FIELDS, minutes=-1)),
])
def test_the_redirect_page_refuses_a_bad_token(client_as, payment_id, token):
    response = client_as(super_admin()).get(f"/api/v1/payments/{payment_id}/redsys-redirect?token={token}")

    assert response.status_code == 403
    assert "bank.example.com" not in response.text


def test_the_redirect_page_refuses_a_payment_that_is_no_longer_pending(client_as):
    token = make_redirect_token("pay-done", FORM_FIELDS)

    response = client_as(super_admin()).get(f"/api/v1/payments/pay-done/redsys-redirect?token={token}")

    assert response.status_code == 409
    assert "bank.example.com" not in response.text


def test_a_redirect_token_is_not_an_access_token():
    from src.infrastructure.web.security import decode_access_token

    assert decode_access_token(make_redirect_token("pay-card", FORM_FIELDS)) is None


def test_the_admin_guard_lets_a_member_reach_their_own_card_exam(card_use_case):
    from src.app import create_app

    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: plain_member(OWN_MEMBER),
        get_member_repository: lambda: MembersByClub(),
        get_initiate_exam_payment_use_case: lambda: card_use_case,
        get_price_configuration_repository: lambda: SimpleNamespace(find_by_keys=AsyncMock(side_effect=active_prices)),
    }
    client = TestClient(app)

    assert client.post("/api/v1/payments/exam/initiate", json=card_body()).status_code == 200
    assert client.get("/api/v1/payments/exam-prices").status_code == 200
    assert client.post("/api/v1/payments/exam", json=body()).status_code == 403


def test_an_exam_already_paid_answers_409_on_both_paths(client_as, exam_use_case, card_use_case):
    exam_use_case.execute.side_effect = PaymentAlreadyExistsError("Examen 2.º Dan ya está pagado en 2026")
    card_use_case.execute.side_effect = PaymentAlreadyExistsError("Examen 2.º Dan ya está pagado en 2026")
    client = client_as(super_admin())

    assert client.post("/api/v1/payments/exam", json=body()).status_code == 409
    assert client.post("/api/v1/payments/exam/initiate", json=card_body()).status_code == 409


def test_a_member_comes_back_from_the_bank_to_a_page_about_the_app(client_as, card_use_case):
    client_as(plain_member(OWN_MEMBER)).post("/api/v1/payments/exam/initiate", json=card_body())

    kwargs = card_use_case.execute.await_args.kwargs
    assert kwargs["success_url"].endswith("/api/v1/payments/exam/return?result=ok")
    assert kwargs["failure_url"].endswith("/api/v1/payments/exam/return?result=ko")


def test_a_manager_comes_back_from_the_bank_to_the_panel_exam_page(client_as, card_use_case):
    client_as(club_admin()).post("/api/v1/payments/exam/initiate", json=card_body())

    kwargs = card_use_case.execute.await_args.kwargs
    assert kwargs["success_url"].endswith("/payment/success?concept=exam")


@pytest.mark.parametrize("result,text", [("ok", "Ya puedes volver a la app"), ("ko", "No se ha cobrado nada")])
def test_the_return_page_tells_the_member_what_happened(client_as, result, text):
    response = TestClient(client_as(super_admin()).app).get(f"/api/v1/payments/exam/return?result={result}")

    assert response.status_code == 200
    assert text in response.text
