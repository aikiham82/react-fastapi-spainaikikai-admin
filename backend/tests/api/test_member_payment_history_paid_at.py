"""Each line of a member's payment history says when and how it was paid."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.app import create_app
from src.application.use_cases.member_payment.get_member_payment_history_use_case import (
    GetMemberPaymentHistoryUseCase,
)
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_member_payment_history_use_case,
    get_member_repository,
)
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]


def line(line_id: str, payment_id: str, year: int, status=MemberPaymentStatus.COMPLETED) -> MemberPayment:
    return MemberPayment(
        id=line_id, payment_id=payment_id, member_id="member-ana", payment_year=year,
        payment_type=MemberPaymentType.SEGURO_ACCIDENTES, concept=f"seguro_accidentes - {year}",
        amount=20, status=status,
    )


TRANSACTIONS = {
    "pay-redsys": Payment(
        id="pay-redsys", status=PaymentStatus.COMPLETED,
        payment_date=datetime(2026, 3, 4, 10, 0), payment_method=PaymentMethod.REDSYS,
    ),
    "pay-cash": Payment(
        id="pay-cash", status=PaymentStatus.COMPLETED,
        payment_date=datetime(2025, 6, 15, 9, 30), payment_method=PaymentMethod.CASH,
    ),
    "pay-undated": Payment(id="pay-undated", status=PaymentStatus.PROCESSING),
    "pay-refunded": Payment(
        id="pay-refunded", status=PaymentStatus.REFUNDED,
        payment_date=datetime(2026, 1, 2, 12, 0), payment_method=PaymentMethod.REDSYS,
    ),
}


@pytest.fixture
def client() -> TestClient:
    members = AsyncMock()
    members.find_by_id.return_value = Member(id="member-ana", first_name="Ana", last_name="Ejemplo")
    member_payments = AsyncMock()
    member_payments.find_by_member_id.return_value = [
        line("mp-1", "pay-redsys", 2026),
        line("mp-2", "pay-cash", 2025),
        line("mp-3", "pay-undated", 2027),
        line("mp-4", "pay-missing", 2024),
        line("mp-5", "pay-refunded", 2026),
        line("mp-6", "pay-cash", 2025, MemberPaymentStatus.PENDING),
    ]
    payments = AsyncMock()
    payments.find_by_id.side_effect = TRANSACTIONS.get
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_member_repository: lambda: members,
        get_member_payment_history_use_case: lambda: GetMemberPaymentHistoryUseCase(
            member_payments, members, payments
        ),
    }
    return TestClient(app)


def test_each_line_carries_the_date_and_method_of_its_payment(client):
    response = client.get("/api/v1/member-payments/member/member-ana/history")

    assert response.status_code == 200
    by_id = {p["id"]: p for p in response.json()["payments"]}
    assert (by_id["mp-1"]["paid_at"], by_id["mp-1"]["payment_method"]) == ("2026-03-04T10:00:00", "redsys")
    assert (by_id["mp-2"]["paid_at"], by_id["mp-2"]["payment_method"]) == ("2025-06-15T09:30:00", "cash")


def test_a_line_without_a_dated_payment_has_no_date(client):
    by_id = {p["id"]: p for p in client.get("/api/v1/member-payments/member/member-ana/history").json()["payments"]}

    assert by_id["mp-3"]["paid_at"] is None
    assert by_id["mp-4"]["paid_at"] is None
    assert by_id["mp-4"]["payment_method"] is None


def test_a_refunded_payment_is_not_shown_as_paid(client):
    by_id = {p["id"]: p for p in client.get("/api/v1/member-payments/member/member-ana/history").json()["payments"]}

    assert by_id["mp-5"]["paid_at"] is None


def test_a_pending_line_has_no_date_even_if_its_payment_completed(client):
    by_id = {p["id"]: p for p in client.get("/api/v1/member-payments/member/member-ana/history").json()["payments"]}

    assert (by_id["mp-6"]["paid_at"], by_id["mp-6"]["payment_method"]) == (None, None)
