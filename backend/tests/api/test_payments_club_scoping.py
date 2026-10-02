"""A club admin reads and starts payments for their own club only."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.payment import Payment
from src.infrastructure.web.dependencies import (
    get_all_payments_use_case,
    get_auth_context,
    get_initiate_annual_payment_use_case,
    get_initiate_redsys_payment_use_case,
    get_member_repository,
    get_payment_use_case,
    get_prefill_annual_payment_use_case,
    get_refund_payment_use_case,
)
from src.infrastructure.web.routers.payments import router
from tests.api.callers import (
    FOREIGN_MEMBER,
    OTHER_CLUB,
    OWN_CLUB,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    super_admin,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]

FORM_DATA = SimpleNamespace(
    payment_url="https://example.com/pay",
    ds_signature_version="v1",
    ds_merchant_parameters="parameters",
    ds_signature="signature",
)


def payment_of(club_id) -> Payment:
    return Payment(id="payment-id", club_id=club_id, amount=10.0)


def annual_request(club_id, member_id=OWN_MEMBER) -> dict:
    return {
        "payer_name": "Club Example",
        "club_id": club_id,
        "payment_year": 2026,
        "seguro_accidentes_count": 1,
        "member_assignments": [
            {"member_id": member_id, "member_name": "Ana Example", "payment_types": ["seguro_accidentes"]}
        ],
    }


@pytest.fixture
def use_cases():
    return SimpleNamespace(
        get_all=AsyncMock(),
        get_one=AsyncMock(),
        prefill=AsyncMock(),
        initiate=AsyncMock(),
        initiate_annual=AsyncMock(),
        refund=AsyncMock(),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx, stored_club=OWN_CLUB) -> TestClient:
        stored = payment_of(stored_club)
        use_cases.get_all.execute.return_value = [stored]
        use_cases.get_one.execute.return_value = stored
        use_cases.refund.execute.return_value = stored
        use_cases.prefill.execute.return_value = SimpleNamespace(
            payer_name="Club Example", include_club_fee=True, club_fee_already_paid=False,
            kyu_count=0, kyu_infantil_count=0, dan_count=0, fukushidoin_count=0, shidoin_count=0,
            seguro_accidentes_count=0, seguro_rc_count=0, member_assignments=[], source="members",
        )
        use_cases.initiate.execute.return_value = SimpleNamespace(
            payment_id="payment-id", order_id="order-id", form_data=FORM_DATA
        )
        use_cases.initiate_annual.execute.return_value = SimpleNamespace(
            payment_id="payment-id", order_id="order-id", total_amount=15.0, line_items=[], form_data=FORM_DATA
        )

        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_all_payments_use_case: lambda: use_cases.get_all,
            get_payment_use_case: lambda: use_cases.get_one,
            get_prefill_annual_payment_use_case: lambda: use_cases.prefill,
            get_initiate_redsys_payment_use_case: lambda: use_cases.initiate,
            get_initiate_annual_payment_use_case: lambda: use_cases.initiate_annual,
            get_refund_payment_use_case: lambda: use_cases.refund,
        }
        return TestClient(app)

    return build


def test_a_club_admin_lists_only_their_own_club(client_as, use_cases):
    response = client_as(club_admin()).get(f"/api/v1/payments?club_id={OTHER_CLUB}")

    assert response.status_code == status.HTTP_200_OK
    use_cases.get_all.execute.assert_called_once_with(0, OWN_CLUB, None, None)


def test_a_club_admin_cannot_list_the_payments_of_a_foreign_member(client_as, use_cases):
    response = client_as(club_admin()).get(f"/api/v1/payments?member_id={FOREIGN_MEMBER}")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.get_all.execute.assert_not_called()


def test_a_club_admin_gets_the_prefill_of_their_own_club_only(client_as, use_cases):
    client = client_as(club_admin())

    assert client.get(f"/api/v1/payments/annual/prefill?club_id={OWN_CLUB}&payment_year=2026").status_code == 200
    assert client.get(f"/api/v1/payments/annual/prefill?club_id={OTHER_CLUB}&payment_year=2026").status_code == 403
    assert use_cases.prefill.execute.call_count == 1


@pytest.mark.parametrize("stored_club", [OTHER_CLUB, None])
@pytest.mark.parametrize("path", ["/api/v1/payments/payment-id", "/api/v1/payments/payment-id/status"])
def test_a_club_admin_is_refused_a_payment_outside_their_club(client_as, stored_club, path):
    response = client_as(club_admin(), stored_club=stored_club).get(path)

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("path", ["/api/v1/payments/payment-id", "/api/v1/payments/payment-id/status"])
def test_a_club_admin_reads_a_payment_of_their_club(client_as, path):
    assert client_as(club_admin()).get(path).status_code == status.HTTP_200_OK


@pytest.mark.parametrize("body", [
    {"club_id": OTHER_CLUB, "payment_type": "license", "amount": 10},
    {"club_id": OWN_CLUB, "member_id": FOREIGN_MEMBER, "payment_type": "license", "amount": 10},
    {"payment_type": "license", "amount": 10},
])
def test_a_club_admin_cannot_start_a_payment_outside_their_club(client_as, use_cases, body):
    response = client_as(club_admin()).post("/api/v1/payments/initiate", json=body)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.initiate.execute.assert_not_called()


def test_a_club_admin_starts_a_payment_for_their_club(client_as):
    response = client_as(club_admin()).post(
        "/api/v1/payments/initiate",
        json={"club_id": OWN_CLUB, "member_id": OWN_MEMBER, "payment_type": "license", "amount": 10},
    )

    assert response.status_code == status.HTTP_200_OK


@pytest.mark.parametrize("body", [
    annual_request(OTHER_CLUB),
    annual_request(OWN_CLUB, member_id=FOREIGN_MEMBER),
])
def test_a_club_admin_cannot_start_an_annual_payment_outside_their_club(client_as, use_cases, body):
    response = client_as(club_admin()).post("/api/v1/payments/annual/initiate", json=body)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.initiate_annual.execute.assert_not_called()


def test_a_club_admin_starts_an_annual_payment_for_their_club(client_as):
    response = client_as(club_admin()).post("/api/v1/payments/annual/initiate", json=annual_request(OWN_CLUB))

    assert response.status_code == status.HTTP_200_OK


def test_a_club_admin_cannot_refund_even_in_their_own_club(client_as, use_cases):
    response = client_as(club_admin()).put("/api/v1/payments/payment-id/refund", json={"refund_amount": 5})

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.refund.execute.assert_not_called()


def test_a_super_admin_works_on_any_club(client_as, use_cases):
    client = client_as(super_admin(), stored_club=OTHER_CLUB)

    assert client.get(f"/api/v1/payments?club_id={OTHER_CLUB}").status_code == status.HTTP_200_OK
    use_cases.get_all.execute.assert_called_once_with(0, OTHER_CLUB, None, None)
    assert client.get("/api/v1/payments/payment-id").status_code == status.HTTP_200_OK
    assert client.get(f"/api/v1/payments/annual/prefill?club_id={OTHER_CLUB}&payment_year=2026").status_code == 200
    assert client.post("/api/v1/payments/annual/initiate", json=annual_request(OTHER_CLUB, FOREIGN_MEMBER)).status_code == 200
    assert client.put("/api/v1/payments/payment-id/refund", json={"refund_amount": 5}).status_code == 200
