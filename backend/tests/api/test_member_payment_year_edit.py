"""A super admin moves a member payment line to another payment year."""

from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.application.use_cases.payment.update_member_payment_use_case import UpdateMemberPaymentUseCase
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.infrastructure.web.dependencies import get_auth_context, get_update_member_payment_use_case
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]


def line() -> MemberPayment:
    return MemberPayment(
        id="mp-ana", payment_id="payment-1", member_id="member-ana", payment_year=2026,
        payment_type=MemberPaymentType.SEGURO_ACCIDENTES, concept="seguro_accidentes - 2026",
        amount=20, status=MemberPaymentStatus.COMPLETED,
    )


@pytest.fixture
def repositories():
    stored = {"line": line()}
    member_payments = AsyncMock()
    member_payments.find_by_id.side_effect = lambda _id: stored["line"]
    member_payments.update.side_effect = lambda mp: stored.update(line=mp) or mp
    member_payments.find_by_payment_id.side_effect = lambda _id: [stored["line"]]
    member_payments.exists_for_member_year_type.return_value = False
    payments = AsyncMock()
    payments.find_by_id.return_value = None
    return stored, member_payments, payments


@pytest.fixture
def client(repositories) -> TestClient:
    _, member_payments, payments = repositories
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_update_member_payment_use_case: lambda: UpdateMemberPaymentUseCase(member_payments, payments),
    }
    return TestClient(app)


def test_a_member_payment_moves_to_another_year(client, repositories):
    stored, member_payments, _ = repositories

    response = client.put("/api/v1/member-payments/mp-ana", json={"payment_year": 2027})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["payment_year"] == 2027
    assert stored["line"].payment_year == 2027
    member_payments.exists_for_member_year_type.assert_awaited_once_with(
        "member-ana", 2027, MemberPaymentType.SEGURO_ACCIDENTES
    )


def test_moving_a_member_payment_onto_a_paid_year_is_refused(client, repositories):
    stored, member_payments, _ = repositories
    member_payments.exists_for_member_year_type.return_value = True

    response = client.put("/api/v1/member-payments/mp-ana", json={"payment_year": 2027})

    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json()["detail"] == "Este miembro ya tiene Seguro Accidentes en 2027"
    assert stored["line"].payment_year == 2026


def test_a_year_out_of_range_is_rejected(client, repositories):
    response = client.put("/api/v1/member-payments/mp-ana", json={"payment_year": 99999})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_changing_the_type_to_one_already_paid_that_year_is_refused(client, repositories):
    stored, member_payments, _ = repositories
    member_payments.exists_for_member_year_type.return_value = True

    response = client.put("/api/v1/member-payments/mp-ana", json={"payment_type": "seguro_rc"})

    assert response.status_code == status.HTTP_409_CONFLICT
    assert stored["line"].payment_type == MemberPaymentType.SEGURO_ACCIDENTES
