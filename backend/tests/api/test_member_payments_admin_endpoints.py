"""API tests for member-payments admin endpoints: list, update, delete.

TDD: Tests are written before implementation.

Pattern:
- Create a minimal FastAPI app with the member_payments router.
- Override get_auth_context and the relevant use-case DI providers via
  app.dependency_overrides (FastAPI's official mechanism).
- Use AsyncMock for use cases so no real DB is touched.

Route-ordering regression tests:
- GET /club/{id}/summary and /club/{id}/unpaid must NOT be shadowed by
  the new bare GET /club/{id} route.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User, GlobalRole
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.exceptions.payment import (
    MemberPaymentNotFoundError,
    InvalidPaymentDataError,
)
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import get_auth_context


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_super_admin_user() -> User:
    return User(
        id="user-super-admin-001",
        email="superadmin@test.com",
        username="superadmin",
        hashed_password="hash",
        global_role=GlobalRole.SUPER_ADMIN,
    )


def _make_regular_user() -> User:
    return User(
        id="user-regular-001",
        email="user@test.com",
        username="regularuser",
        hashed_password="hash",
        global_role=GlobalRole.USER,
    )


def _make_super_admin_ctx() -> AuthContext:
    return AuthContext(user=_make_super_admin_user())


def _make_regular_ctx() -> AuthContext:
    return AuthContext(user=_make_regular_user())


def _make_member_payment(
    mp_id: str = "mp-001",
    payment_id: str = "pay-001",
    member_id: str = "member-001",
    amount: float = 50.0,
    payment_type: MemberPaymentType = MemberPaymentType.LICENCIA_KYU,
    status_val: MemberPaymentStatus = MemberPaymentStatus.COMPLETED,
) -> MemberPayment:
    return MemberPayment(
        id=mp_id,
        payment_id=payment_id,
        member_id=member_id,
        payment_year=2026,
        payment_type=payment_type,
        concept="kyu - 2026",
        amount=amount,
        status=status_val,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_app():
    """Create isolated FastAPI test app with the member_payments router.

    The router has prefix="/member-payments" already, so we include it at
    "/api/v1" matching how src/app.py registers it.
    """
    from src.infrastructure.web.routers.member_payments import router
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


# ---------------------------------------------------------------------------
# GET /club/{club_id} — list all MemberPayments for a club
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestGetClubMemberPayments:
    """Tests for GET /api/v1/member-payments/club/{club_id}."""

    def test_super_admin_gets_club_member_payments_returns_200(self, test_app):
        """Super admin gets list of member payments for a club → 200 with list."""
        from src.infrastructure.web.dependencies import get_list_club_member_payments_use_case

        mp1 = _make_member_payment("mp-001", "pay-001")
        mp2 = _make_member_payment("mp-002", "pay-002", member_id="member-002", amount=30.0)

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = [mp1, mp2]

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_list_club_member_payments_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.get("/api/v1/member-payments/club/club-001")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["id"] == "mp-001"
        assert data[1]["id"] == "mp-002"

    def test_non_super_admin_gets_403(self, test_app):
        """Regular user trying GET /club/{id} → 403."""
        from src.infrastructure.web.dependencies import get_list_club_member_payments_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_list_club_member_payments_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.get("/api/v1/member-payments/club/club-001")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_default_year_is_used_when_not_provided(self, test_app):
        """When payment_year is not provided, use case is called with current year."""
        from src.infrastructure.web.dependencies import get_list_club_member_payments_use_case
        from datetime import datetime as dt

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = []

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_list_club_member_payments_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        client.get("/api/v1/member-payments/club/club-001")

        call_kwargs = mock_use_case.execute.call_args.kwargs
        assert call_kwargs["club_id"] == "club-001"
        assert call_kwargs["payment_year"] == dt.now().year

    def test_payment_year_query_param_is_forwarded(self, test_app):
        """When payment_year is given, it is forwarded to use case."""
        from src.infrastructure.web.dependencies import get_list_club_member_payments_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = []

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_list_club_member_payments_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        client.get("/api/v1/member-payments/club/club-001?payment_year=2025")

        call_kwargs = mock_use_case.execute.call_args.kwargs
        assert call_kwargs["payment_year"] == 2025

    def test_empty_result_returns_empty_list(self, test_app):
        """When no payments exist, returns 200 with empty list."""
        from src.infrastructure.web.dependencies import get_list_club_member_payments_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = []

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_list_club_member_payments_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.get("/api/v1/member-payments/club/club-001")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []


# ---------------------------------------------------------------------------
# PUT /{member_payment_id} — update a MemberPayment line
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestUpdateMemberPayment:
    """Tests for PUT /api/v1/member-payments/{member_payment_id}."""

    def test_super_admin_updates_member_payment_returns_200(self, test_app):
        """Super admin updates a member payment line → 200."""
        from src.infrastructure.web.dependencies import get_update_member_payment_use_case

        updated_mp = _make_member_payment("mp-001", amount=75.0)

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = updated_mp

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.put(
            "/api/v1/member-payments/mp-001",
            json={"amount": 75.0, "concept": "Updated concept"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == "mp-001"
        assert data["amount"] == 75.0

    def test_non_super_admin_update_returns_403(self, test_app):
        """Regular user trying PUT /{id} → 403."""
        from src.infrastructure.web.dependencies import get_update_member_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_update_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.put("/api/v1/member-payments/mp-001", json={"amount": 75.0})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_update_not_found_returns_404(self, test_app):
        """MemberPaymentNotFoundError from use case → 404."""
        from src.infrastructure.web.dependencies import get_update_member_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = MemberPaymentNotFoundError("mp-nonexistent")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.put("/api/v1/member-payments/mp-nonexistent", json={"amount": 75.0})

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_invalid_data_returns_400(self, test_app):
        """InvalidPaymentDataError from use case → 400."""
        from src.infrastructure.web.dependencies import get_update_member_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = InvalidPaymentDataError("Importe negativo")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.put("/api/v1/member-payments/mp-001", json={"amount": -10.0})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_passes_correct_fields_to_use_case(self, test_app):
        """PUT body fields are forwarded to use case correctly."""
        from src.infrastructure.web.dependencies import get_update_member_payment_use_case

        updated_mp = _make_member_payment("mp-001")
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = updated_mp

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        client.put(
            "/api/v1/member-payments/mp-001",
            json={"amount": 99.0, "concept": "New concept", "status": "completed"},
        )

        call_kwargs = mock_use_case.execute.call_args.kwargs
        assert call_kwargs["member_payment_id"] == "mp-001"
        assert call_kwargs["amount"] == 99.0
        assert call_kwargs["concept"] == "New concept"
        assert call_kwargs["status"] == "completed"


# ---------------------------------------------------------------------------
# DELETE /{member_payment_id} — delete a MemberPayment line
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestDeleteMemberPayment:
    """Tests for DELETE /api/v1/member-payments/{member_payment_id}."""

    def test_super_admin_deletes_member_payment_returns_204(self, test_app):
        """Super admin deletes a member payment line → 204 No Content."""
        from src.infrastructure.web.dependencies import get_delete_member_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.delete("/api/v1/member-payments/mp-001")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_use_case.execute.assert_awaited_once_with("mp-001")

    def test_non_super_admin_delete_returns_403(self, test_app):
        """Regular user trying DELETE /{id} → 403."""
        from src.infrastructure.web.dependencies import get_delete_member_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_delete_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.delete("/api/v1/member-payments/mp-001")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_delete_not_found_returns_404(self, test_app):
        """MemberPaymentNotFoundError from use case → 404."""
        from src.infrastructure.web.dependencies import get_delete_member_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = MemberPaymentNotFoundError("mp-nonexistent")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_member_payment_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.delete("/api/v1/member-payments/mp-nonexistent")

        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Route-ordering regression tests
# These verify that GET /club/{id}/summary and /club/{id}/unpaid are NOT
# shadowed by the new bare GET /club/{id} route.
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestRouteOrderingRegression:
    """Regression tests ensuring specific sub-paths are not shadowed by the
    new bare /club/{club_id} route."""

    def test_club_summary_route_still_resolves_not_404(self, test_app):
        """GET /club/{id}/summary must still resolve to its own handler (not 404 due to shadowing)."""
        from src.infrastructure.web.dependencies import get_club_payment_summary_use_case

        # Build a minimal result so the handler can return 200
        mock_result = MagicMock()
        mock_result.club_id = "club-001"
        mock_result.club_name = "Test Club"
        mock_result.payment_year = 2026
        mock_result.total_members = 5
        mock_result.members_with_license = 3
        mock_result.members_with_insurance = 2
        mock_result.total_collected = 250.0
        mock_result.has_club_fee = False
        mock_result.by_payment_type = []
        mock_result.members = []

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = mock_result

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_club_payment_summary_use_case] = (
            lambda: mock_use_case
        )

        client = TestClient(test_app)
        response = client.get("/api/v1/member-payments/club/club-001/summary")

        # Must NOT be 404 (which would indicate shadowing by the bare /club/{id})
        assert response.status_code != status.HTTP_404_NOT_FOUND
        assert response.status_code == status.HTTP_200_OK
        # Verify it hit the summary handler, not the bare list handler
        mock_use_case.execute.assert_awaited_once()

    def test_club_unpaid_route_still_resolves_not_404(self, test_app):
        """GET /club/{id}/unpaid must still resolve to its own handler (not 404 due to shadowing)."""
        from src.infrastructure.web.dependencies import get_unpaid_members_use_case

        mock_result = MagicMock()
        mock_result.club_id = "club-001"
        mock_result.payment_year = 2026
        mock_result.payment_type = None
        mock_result.unpaid_members = []
        mock_result.total_count = 0

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = mock_result

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_unpaid_members_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.get("/api/v1/member-payments/club/club-001/unpaid")

        # Must NOT be 404 (which would indicate shadowing)
        assert response.status_code != status.HTTP_404_NOT_FOUND
        assert response.status_code == status.HTTP_200_OK
        mock_use_case.execute.assert_awaited_once()
