"""The server refuses a club admin a licence or title that does not fit the member."""

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
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_initiate_annual_payment_use_case,
    get_license_repository,
    get_member_payment_repository,
    get_member_repository,
    get_payment_repository,
    get_register_manual_payment_use_case,
    get_update_member_payment_use_case,
)
from src.infrastructure.web.routers.member_payments import router as member_payments_router
from src.infrastructure.web.routers.payments import router as payments_router
from tests.api.callers import OWN_CLUB, club_admin, super_admin

pytestmark = [pytest.mark.api, pytest.mark.auth]

INSTRUCTOR = "member-instructor"
KYU = "member-kyu"
MEMBERS = [
    Member(id=INSTRUCTOR, club_id=OWN_CLUB, first_name="Ana", last_name="Example", birth_date=datetime(1980, 1, 1)),
    Member(id=KYU, club_id=OWN_CLUB, first_name="Beto", last_name="Example", birth_date=datetime(1990, 1, 1)),
]
LICENCES = [
    License(license_number="QA-1", member_id=INSTRUCTOR, grade="3 dan", technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.SHIDOIN, age_category=AgeCategory.ADULTO),
    License(license_number="QA-2", member_id=KYU, grade="2 kyu", technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE, age_category=AgeCategory.ADULTO),
]
THIS_YEAR = datetime.utcnow().year
COUNT_FIELD = {"kyu": "kyu_count", "dan": "dan_count", "shidoin": "shidoin_count", "seguro_rc": "seguro_rc_count"}


def line_of(payment_type: MemberPaymentType) -> MemberPayment:
    return MemberPayment(
        id="line-1", payment_id="pay-1", member_id=KYU, payment_year=THIS_YEAR, payment_type=payment_type,
        concept="line", amount=15, status=MemberPaymentStatus.COMPLETED,
    )


@pytest.fixture
def use_cases():
    payment = Payment(id="pay-1", club_id=OWN_CLUB, amount=15, status=PaymentStatus.COMPLETED, payment_method=PaymentMethod.CASH, payment_year=2026)
    form_data = SimpleNamespace(payment_url="https://example.com/pay", ds_signature_version="v1", ds_merchant_parameters="p", ds_signature="s")
    return SimpleNamespace(
        payment=payment,
        initiate=AsyncMock(**{"execute.return_value": SimpleNamespace(payment_id="pay-1", order_id="o", total_amount=15.0, line_items=[], form_data=form_data)}),
        manual=AsyncMock(**{"execute.return_value": SimpleNamespace(payment=payment, member_payments=[], invoice=None)}),
        update_line=AsyncMock(**{"execute.return_value": line_of(MemberPaymentType.LICENCIA_KYU)}),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx) -> TestClient:
        app = FastAPI()
        app.include_router(payments_router, prefix="/api/v1")
        app.include_router(member_payments_router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_initiate_annual_payment_use_case: lambda: use_cases.initiate,
            get_register_manual_payment_use_case: lambda: use_cases.manual,
            get_update_member_payment_use_case: lambda: use_cases.update_line,
            get_license_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=LICENCES)),
            get_member_repository: lambda: SimpleNamespace(
                find_by_club_id=AsyncMock(return_value=MEMBERS),
                find_by_id=AsyncMock(side_effect={m.id: m for m in MEMBERS}.get),
            ),
            get_member_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(return_value=line_of(MemberPaymentType.LICENCIA_KYU))),
            get_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(return_value=use_cases.payment)),
        }
        return TestClient(app)

    return build


def assignment(member_id: str, item: str) -> list:
    return [{"member_id": member_id, "member_name": "Forged Name", "payment_types": [item]}]


def initiate(client: TestClient, member_id: str, item: str):
    return client.post("/api/v1/payments/annual/initiate", json={
        "payer_name": "Club Example", "club_id": OWN_CLUB, "payment_year": THIS_YEAR,
        COUNT_FIELD[item]: 1, "member_assignments": assignment(member_id, item),
    })


def manual(client: TestClient, member_id: str, item: str):
    return client.post("/api/v1/payments/manual", json={
        "payer_name": "Club Example", "club_id": OWN_CLUB, "payment_year": THIS_YEAR, "payment_method": "cash",
        "member_assignments": assignment(member_id, item),
    })


PAYING = pytest.mark.parametrize(("pay", "use_case", "ok"), [(initiate, "initiate", 200), (manual, "manual", 201)])


@PAYING
@pytest.mark.parametrize(("member_id", "item"), [(INSTRUCTOR, "kyu"), (KYU, "shidoin")])
def test_a_club_admin_is_refused_a_licence_that_does_not_fit(client_as, use_cases, pay, use_case, ok, member_id, item):
    response = pay(client_as(club_admin()), member_id, item)

    assert response.status_code == 400
    assert "no corresponde a su licencia" in response.json()["detail"]
    assert "Forged" not in response.json()["detail"]
    getattr(use_cases, use_case).execute.assert_not_awaited()


@PAYING
@pytest.mark.parametrize(("member_id", "item"), [(INSTRUCTOR, "shidoin"), (KYU, "kyu"), (KYU, "dan"), (INSTRUCTOR, "seguro_rc")])
def test_a_club_admin_pays_what_fits(client_as, pay, use_case, ok, member_id, item):
    assert pay(client_as(club_admin()), member_id, item).status_code == ok


@PAYING
def test_a_super_admin_is_not_checked(client_as, pay, use_case, ok):
    assert pay(client_as(super_admin()), KYU, "shidoin").status_code == ok


def test_a_club_admin_cannot_change_a_line_to_a_licence_that_does_not_fit(client_as, use_cases):
    response = client_as(club_admin()).put("/api/v1/member-payments/line-1", json={"payment_type": "titulo_shidoin"})

    assert response.status_code == 400
    assert "no corresponde a su licencia" in response.json()["detail"]
    use_cases.update_line.execute.assert_not_awaited()


@pytest.mark.parametrize("body", [{"payment_type": "licencia_dan"}, {"payment_type": "seguro_rc"}, {"amount": 10}])
def test_a_club_admin_can_make_any_other_line_edit(client_as, body):
    assert client_as(club_admin()).put("/api/v1/member-payments/line-1", json=body).status_code == 200


def test_a_super_admin_can_change_a_line_to_any_licence(client_as):
    response = client_as(super_admin()).put("/api/v1/member-payments/line-1", json={"payment_type": "titulo_shidoin"})

    assert response.status_code == 200
