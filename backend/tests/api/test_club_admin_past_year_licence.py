"""In a past year a club admin may record any grade licence, never a title the member does not hold."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.license import AgeCategory, InstructorCategory, License, TechnicalGrade
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.entities.price_configuration import PriceConfiguration
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_initiate_annual_payment_use_case,
    get_license_repository,
    get_member_payment_repository,
    get_member_repository,
    get_payment_repository,
    get_price_configuration_repository,
    get_register_manual_payment_use_case,
    get_update_member_payment_use_case,
)
from src.infrastructure.web.routers.member_payments import router as member_payments_router
from src.infrastructure.web.routers.payments import router as payments_router
from tests.api.callers import OWN_CLUB, club_admin

pytestmark = [pytest.mark.api, pytest.mark.auth]

THIS_YEAR = datetime.utcnow().year
LAST_YEAR = THIS_YEAR - 1
DAN = "member-dan"
INSTRUCTOR = "member-instructor"
MEMBERS = [
    Member(id=DAN, club_id=OWN_CLUB, first_name="Ana", last_name="Example", birth_date=datetime(1980, 1, 1)),
    Member(id=INSTRUCTOR, club_id=OWN_CLUB, first_name="Beto", last_name="Example", birth_date=datetime(1980, 1, 1)),
]
LICENCES = [
    License(license_number="QA-1", member_id=DAN, grade="3º Dan", technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE, age_category=AgeCategory.ADULTO),
    License(license_number="QA-2", member_id=INSTRUCTOR, grade="Shidoin", technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.SHIDOIN, age_category=AgeCategory.ADULTO),
]
COUNT_FIELD = {"kyu": "kyu_count", "kyu_infantil": "kyu_infantil_count", "dan": "dan_count", "shidoin": "shidoin_count"}


def line_of(payment_type: MemberPaymentType, year: int) -> MemberPayment:
    return MemberPayment(
        id="line-1", payment_id="pay-1", member_id=DAN, payment_year=year, payment_type=payment_type,
        concept="line", amount=15, status=MemberPaymentStatus.COMPLETED,
    )


@pytest.fixture
def stored():
    return SimpleNamespace(line=line_of(MemberPaymentType.LICENCIA_DAN, LAST_YEAR))


@pytest.fixture
def client(stored):
    payment = Payment(id="pay-1", club_id=OWN_CLUB, amount=15, status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.CASH, payment_year=LAST_YEAR)
    form_data = SimpleNamespace(payment_url="https://example.com/pay", ds_signature_version="v1", ds_merchant_parameters="p", ds_signature="s")
    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1")
    app.include_router(member_payments_router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: club_admin(),
        get_initiate_annual_payment_use_case: lambda: AsyncMock(**{"execute.return_value": SimpleNamespace(payment_id="pay-1", order_id="o", total_amount=15.0, line_items=[], form_data=form_data)}),
        get_register_manual_payment_use_case: lambda: AsyncMock(**{"execute.return_value": SimpleNamespace(payment=payment, member_payments=[], invoice=None)}),
        get_update_member_payment_use_case: lambda: AsyncMock(**{"execute.return_value": stored.line}),
        get_license_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=LICENCES)),
        get_price_configuration_repository: lambda: SimpleNamespace(
            find_by_key=AsyncMock(side_effect=lambda key: PriceConfiguration(key=key, price=15.0, category="license"))
        ),
        get_member_repository: lambda: SimpleNamespace(
            find_by_club_id=AsyncMock(return_value=MEMBERS),
            find_by_id=AsyncMock(side_effect={m.id: m for m in MEMBERS}.get),
        ),
        get_member_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(side_effect=lambda _: stored.line)),
        get_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(return_value=payment)),
    }
    return TestClient(app)


def manual(client: TestClient, member_id: str, item: str, year: int) -> int:
    return client.post("/api/v1/payments/manual", json={
        "payer_name": "Club Example", "club_id": OWN_CLUB, "payment_year": year, "payment_method": "cash",
        "member_assignments": [{"member_id": member_id, "member_name": "Ana", "payment_types": [item]}],
    }).status_code


def initiate(client: TestClient, member_id: str, item: str, year: int) -> int:
    return client.post("/api/v1/payments/annual/initiate", json={
        "payer_name": "Club Example", "club_id": OWN_CLUB, "payment_year": year, COUNT_FIELD[item]: 1,
        "member_assignments": [{"member_id": member_id, "member_name": "Ana", "payment_types": [item]}],
    }).status_code


@pytest.mark.parametrize(("pay", "ok"), [(manual, 201), (initiate, 200)])
@pytest.mark.parametrize(("member_id", "item"), [(DAN, "kyu"), (DAN, "kyu_infantil"), (INSTRUCTOR, "kyu"), (INSTRUCTOR, "shidoin")])
def test_a_past_year_accepts_any_grade_licence_and_the_title_held(client, pay, ok, member_id, item):
    assert pay(client, member_id, item, LAST_YEAR) == ok


@pytest.mark.parametrize("pay", [manual, initiate])
def test_a_past_year_refuses_a_title_the_member_does_not_hold(client, pay):
    assert pay(client, DAN, "shidoin", LAST_YEAR) == 400


@pytest.mark.parametrize("pay", [manual, initiate])
def test_the_current_year_stays_strict(client, pay):
    assert pay(client, DAN, "kyu", THIS_YEAR) == 400


def edit(client: TestClient, body: dict) -> int:
    return client.put("/api/v1/member-payments/line-1", json=body).status_code


def test_a_past_line_can_become_the_grade_held_that_year(client):
    assert edit(client, {"payment_type": "licencia_kyu"}) == 200


def test_a_past_line_cannot_become_a_title_the_member_does_not_hold(client):
    assert edit(client, {"payment_type": "titulo_shidoin"}) == 400


def test_a_past_kyu_line_cannot_be_moved_to_the_current_year(client, stored):
    stored.line = line_of(MemberPaymentType.LICENCIA_KYU, LAST_YEAR)

    assert edit(client, {"payment_year": THIS_YEAR}) == 400


def test_a_line_type_and_year_changed_together_are_judged_by_the_new_year(client, stored):
    assert edit(client, {"payment_type": "licencia_kyu", "payment_year": THIS_YEAR}) == 400


def test_a_current_line_can_be_moved_to_a_past_year_as_another_grade(client, stored):
    stored.line = line_of(MemberPaymentType.LICENCIA_DAN, THIS_YEAR)

    assert edit(client, {"payment_type": "licencia_kyu", "payment_year": LAST_YEAR}) == 200


def test_moving_a_fitting_line_to_another_year_is_allowed(client):
    assert edit(client, {"payment_year": THIS_YEAR}) == 200


def test_a_past_title_line_can_be_moved_between_past_years_though_the_title_is_gone(client, stored):
    stored.line = line_of(MemberPaymentType.TITULO_FUKUSHIDOIN, LAST_YEAR)

    assert edit(client, {"payment_year": LAST_YEAR - 1}) == 200


def test_a_past_title_line_cannot_be_moved_to_the_current_year_once_the_title_is_gone(client, stored):
    stored.line = line_of(MemberPaymentType.TITULO_FUKUSHIDOIN, LAST_YEAR)

    assert edit(client, {"payment_year": THIS_YEAR}) == 400


def test_an_old_line_that_no_longer_fits_can_still_be_saved_with_its_amount(client, stored):
    stored.line = line_of(MemberPaymentType.LICENCIA_KYU, LAST_YEAR)

    assert edit(client, {"amount": 15, "status": "completed"}) == 200
