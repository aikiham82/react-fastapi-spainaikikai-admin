"""A club admin changes the payments of their own club, and only those."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_delete_member_payment_use_case,
    get_delete_payment_use_case,
    get_list_club_member_payments_use_case,
    get_member_payment_repository,
    get_member_repository,
    get_payment_repository,
    get_refund_payment_use_case,
    get_register_manual_payment_use_case,
    get_update_member_payment_use_case,
    get_update_payment_use_case,
)
from src.infrastructure.web.routers.member_payments import router as member_payments_router
from src.infrastructure.web.routers.payments import router as payments_router
from tests.api.callers import (
    FOREIGN_MEMBER,
    OTHER_CLUB,
    OWN_CLUB,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    plain_member,
    super_admin,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]


def line(line_id: str, member_id: str, payment_id: str = "pay-own") -> MemberPayment:
    return MemberPayment(
        id=line_id, payment_id=payment_id, member_id=member_id, payment_year=2026,
        payment_type=MemberPaymentType.SEGURO_ACCIDENTES, concept="seguro_accidentes - 2026",
        amount=20, status=MemberPaymentStatus.PENDING,
    )


def payment(payment_id: str, club_id: str, method: PaymentMethod = PaymentMethod.CASH) -> Payment:
    return Payment(
        id=payment_id, club_id=club_id, amount=20, status=PaymentStatus.COMPLETED,
        payment_method=method, payment_year=2026,
    )


LINES = {
    "mp-own": line("mp-own", OWN_MEMBER),
    "mp-foreign": line("mp-foreign", FOREIGN_MEMBER, "pay-foreign"),
    "mp-moved": line("mp-moved", OWN_MEMBER, "pay-foreign"),
    "mp-card": line("mp-card", OWN_MEMBER, "pay-card"),
}
PAYMENTS = {
    "pay-own": payment("pay-own", OWN_CLUB),
    "pay-foreign": payment("pay-foreign", OTHER_CLUB),
    "pay-card": payment("pay-card", OWN_CLUB, PaymentMethod.REDSYS),
}


@pytest.fixture
def use_cases():
    manual_result = SimpleNamespace(payment=payment("pay-new", OWN_CLUB), member_payments=[line("mp-new", OWN_MEMBER)], invoice=None)
    return SimpleNamespace(
        list_club=AsyncMock(**{"execute.return_value": []}),
        update_line=AsyncMock(**{"execute.return_value": LINES["mp-own"]}),
        delete_line=AsyncMock(**{"execute.return_value": None}),
        manual=AsyncMock(**{"execute.return_value": manual_result}),
        update_payment=AsyncMock(**{"execute.return_value": PAYMENTS["pay-own"]}),
        delete_payment=AsyncMock(**{"execute.return_value": None}),
        refund=AsyncMock(**{"execute.return_value": PAYMENTS["pay-own"]}),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx) -> TestClient:
        app = FastAPI()
        app.include_router(member_payments_router, prefix="/api/v1")
        app.include_router(payments_router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_member_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(side_effect=LINES.get)),
            get_payment_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(side_effect=PAYMENTS.get)),
            get_list_club_member_payments_use_case: lambda: use_cases.list_club,
            get_update_member_payment_use_case: lambda: use_cases.update_line,
            get_delete_member_payment_use_case: lambda: use_cases.delete_line,
            get_register_manual_payment_use_case: lambda: use_cases.manual,
            get_update_payment_use_case: lambda: use_cases.update_payment,
            get_delete_payment_use_case: lambda: use_cases.delete_payment,
            get_refund_payment_use_case: lambda: use_cases.refund,
        }
        return TestClient(app)

    return build


def manual_body(club_id: str, member_id: str) -> dict:
    return {
        "payer_name": "Club Example", "club_id": club_id, "payment_year": 2026, "payment_method": "cash",
        "member_assignments": [{"member_id": member_id, "member_name": "Ana Example", "payment_types": ["seguro_accidentes"]}],
    }


def calls(client: TestClient, line_id: str, payment_id: str, club_id: str, member_id: str) -> dict:
    return {
        "list": client.get(f"/api/v1/member-payments/club/{club_id}").status_code,
        "update_line": client.put(f"/api/v1/member-payments/{line_id}", json={"status": "completed"}).status_code,
        "delete_line": client.delete(f"/api/v1/member-payments/{line_id}").status_code,
        "manual": client.post("/api/v1/payments/manual", json=manual_body(club_id, member_id)).status_code,
        "update_payment": client.put(f"/api/v1/payments/{payment_id}", json={"status": "completed"}).status_code,
        "delete_payment": client.delete(f"/api/v1/payments/{payment_id}").status_code,
        "refund": client.put(f"/api/v1/payments/{payment_id}/refund", json={}).status_code,
    }


OK = {"list": 200, "update_line": 200, "delete_line": 204, "manual": 201,
      "update_payment": 200, "delete_payment": 204, "refund": 200}


def test_a_club_admin_changes_their_own_clubs_payments(client_as):
    assert calls(client_as(club_admin()), "mp-own", "pay-own", OWN_CLUB, OWN_MEMBER) == OK


def test_a_club_admin_is_refused_another_clubs_payments(client_as, use_cases):
    answered = calls(client_as(club_admin()), "mp-foreign", "pay-foreign", OTHER_CLUB, FOREIGN_MEMBER)

    assert answered == {name: status.HTTP_403_FORBIDDEN for name in answered}
    use_cases.update_line.execute.assert_not_awaited()
    use_cases.delete_payment.execute.assert_not_awaited()
    use_cases.manual.execute.assert_not_awaited()


def test_a_club_admin_cannot_pay_another_clubs_member_through_their_own_club(client_as, use_cases):
    response = client_as(club_admin()).post("/api/v1/payments/manual", json=manual_body(OWN_CLUB, FOREIGN_MEMBER))

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.manual.execute.assert_not_awaited()


def test_an_unknown_payment_answers_like_a_foreign_one_to_a_club_admin(client_as):
    client = client_as(club_admin())

    assert client.put("/api/v1/member-payments/mp-missing", json={"status": "completed"}).status_code == 403
    assert client.delete("/api/v1/payments/pay-missing").status_code == 403


def test_a_plain_member_changes_no_payment(client_as):
    answered = calls(client_as(plain_member()), "mp-own", "pay-own", OWN_CLUB, OWN_MEMBER)

    assert answered == {name: status.HTTP_403_FORBIDDEN for name in answered}


def test_a_super_admin_still_changes_any_clubs_payments(client_as):
    assert calls(client_as(super_admin()), "mp-foreign", "pay-foreign", OTHER_CLUB, FOREIGN_MEMBER) == OK


def test_a_club_admin_cannot_change_a_line_paid_through_another_club(client_as, use_cases):
    client = client_as(club_admin())

    assert client.put("/api/v1/member-payments/mp-moved", json={"status": "completed"}).status_code == 403
    assert client.delete("/api/v1/member-payments/mp-moved").status_code == 403
    use_cases.update_line.execute.assert_not_awaited()
    use_cases.delete_line.execute.assert_not_awaited()


def test_a_card_payment_the_federation_received_is_left_to_the_super_admin(client_as, use_cases):
    client = client_as(club_admin())

    answered = {
        "update_line": client.put("/api/v1/member-payments/mp-card", json={"status": "pending"}).status_code,
        "delete_line": client.delete("/api/v1/member-payments/mp-card").status_code,
        "update_payment": client.put("/api/v1/payments/pay-card", json={"status": "pending"}).status_code,
        "delete_payment": client.delete("/api/v1/payments/pay-card?force=true").status_code,
        "refund": client.put("/api/v1/payments/pay-card/refund", json={}).status_code,
    }

    assert answered == {name: status.HTTP_403_FORBIDDEN for name in answered}
    use_cases.delete_payment.execute.assert_not_awaited()
    use_cases.refund.execute.assert_not_awaited()


def test_a_super_admin_still_changes_a_card_payment(client_as):
    client = client_as(super_admin())

    assert client.put("/api/v1/member-payments/mp-card", json={"status": "pending"}).status_code == 200
    assert client.put("/api/v1/payments/pay-card/refund", json={}).status_code == 200
