"""Infinity and NaN cannot be stored: every JSON response holding one answers 500."""

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel, TypeAdapter, ValidationError

from src.app import create_app, request_validation_handler
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.dto.annual_payment_dto import AnnualPaymentLineItem
from src.infrastructure.web.dto.insurance_dto import InsuranceCreate, InsuranceUpdate
from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest
from src.infrastructure.web.dto.money import Money
from src.infrastructure.web.dto.member_payment_dto import MemberPaymentUpdateRequest
from src.infrastructure.web.dto.payment_dto import (
    InitiatePaymentRequest,
    PaymentCreate,
    PaymentRefundRequest,
    RedsysPaymentRequest,
)
from src.infrastructure.web.dto.price_configuration_dto import PriceConfigurationCreate, PriceConfigurationUpdate
from src.infrastructure.web.dto.seminar_dto import SeminarCreate, SeminarUpdate
from src.infrastructure.web.routers.import_export import _money
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]

MONEY_FIELDS = [
    (AnnualPaymentLineItem, "unit_price"),
    (AnnualPaymentLineItem, "total"),
    (InsuranceCreate, "coverage_amount"),
    (InsuranceUpdate, "coverage_amount"),
    (PaymentUpdateRequest, "amount"),
    (MemberPaymentUpdateRequest, "amount"),
    (InitiatePaymentRequest, "amount"),
    (PaymentCreate, "amount"),
    (PaymentRefundRequest, "refund_amount"),
    (RedsysPaymentRequest, "amount"),
    (PriceConfigurationCreate, "price"),
    (PriceConfigurationUpdate, "price"),
    (SeminarCreate, "price"),
    (SeminarUpdate, "price"),
]
FIELD_IDS = [f"{model.__name__}.{field}" for model, field in MONEY_FIELDS]


def field_adapter(model: type[BaseModel], field: str) -> TypeAdapter:
    return TypeAdapter(model.model_fields[field].rebuild_annotation())


@pytest.mark.parametrize(("model", "field"), MONEY_FIELDS, ids=FIELD_IDS)
@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")], ids=["inf", "minus-inf", "nan"])
def test_a_money_field_refuses_a_non_money(model, field, value):
    with pytest.raises(ValidationError):
        field_adapter(model, field).validate_python(value)


@pytest.mark.parametrize(("model", "field"), MONEY_FIELDS, ids=FIELD_IDS)
@pytest.mark.parametrize("value", [0, 15.5, 1_000_000], ids=["zero", "with-cents", "the-limit"])
def test_a_money_field_accepts_a_normal_amount(model, field, value):
    assert field_adapter(model, field).validate_python(value) == value


@pytest.fixture
def validating_client() -> TestClient:
    class Body(BaseModel):
        amount: Money

    app = FastAPI()
    app.add_exception_handler(RequestValidationError, request_validation_handler)

    @app.post("/amount")
    def amount(body: Body) -> dict:
        return {"amount": body.amount}

    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize("raw", ["Infinity", "-Infinity", "NaN", "1e400"])
def test_a_non_finite_body_answers_422_and_not_500(validating_client, raw):
    response = validating_client.post(
        "/amount", content=f'{{"amount":{raw}}}', headers={"content-type": "application/json"}
    )

    assert response.status_code == 422


def test_a_validation_error_says_what_failed_without_echoing_the_input(validating_client):
    response = validating_client.post("/amount", json={"amount": "secret" * 1000})

    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "amount"]
    assert error["msg"]
    assert "input" not in error
    assert "secret" not in response.text


def test_the_real_payment_line_route_answers_422_for_infinity():
    app = create_app()
    app.dependency_overrides[get_auth_context] = lambda: super_admin()

    response = TestClient(app, raise_server_exceptions=False).put(
        "/api/v1/member-payments/line-1",
        content='{"amount":Infinity}',
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("raw", ["inf", "-inf", "nan", "Infinity", "1e400", "1e308", "1000001"])
def test_an_imported_non_money_is_invalid(raw):
    with pytest.raises(ValueError):
        _money(raw)


@pytest.mark.parametrize(("raw", "expected"), [("15,5", 15.5), ("15.5", 15.5), (20, 20.0), ("0", 0.0)])
def test_an_imported_number_is_read(raw, expected):
    assert _money(raw) == expected
