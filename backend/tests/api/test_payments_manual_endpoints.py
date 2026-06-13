"""API tests for payments manual, update, and cascade-delete endpoints.

TDD: Tests are written before implementation.

Pattern:
- Create a minimal FastAPI app with the payments router.
- Override get_auth_context and the relevant use-case DI providers via
  app.dependency_overrides (FastAPI's official mechanism).
- Use AsyncMock for use cases so no real DB is touched.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User, GlobalRole
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    InvalidPaymentStatusError,
    InvalidPaymentDataError,
    DuplicatePaymentForYearError,
)
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import get_auth_context


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_super_admin_user() -> User:
    """Return a User with GlobalRole.SUPER_ADMIN."""
    return User(
        id="user-super-admin-001",
        email="superadmin@test.com",
        username="superadmin",
        hashed_password="hash",
        global_role=GlobalRole.SUPER_ADMIN,
    )


def _make_regular_user() -> User:
    """Return a User with GlobalRole.USER (no super admin)."""
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


def _make_payment(
    payment_id: str = "pay-001",
    status_val: PaymentStatus = PaymentStatus.COMPLETED,
    method: PaymentMethod = PaymentMethod.CASH,
) -> Payment:
    return Payment(
        id=payment_id,
        club_id="club-001",
        payment_type=PaymentType.ANNUAL_QUOTA,
        amount=150.0,
        status=status_val,
        payment_method=method,
        payment_year=2026,
        payer_name="Test Payer",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )


def _make_member_payment(mp_id: str = "mp-001", payment_id: str = "pay-001") -> MemberPayment:
    return MemberPayment(
        id=mp_id,
        payment_id=payment_id,
        member_id="member-001",
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="kyu - 2026",
        amount=50.0,
        status=MemberPaymentStatus.COMPLETED,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_app():
    """Create isolated FastAPI test app with the payments router.

    The router has prefix="/payments" already, so we include it at "/api/v1"
    matching how src/app.py registers it, so routes land at /api/v1/payments/*.
    """
    from src.infrastructure.web.routers.payments import router
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def manual_payment_payload() -> dict:
    return {
        "payer_name": "Club Director",
        "club_id": "club-001",
        "payment_year": 2026,
        "payment_method": "cash",
        "member_assignments": [
            {
                "member_id": "member-001",
                "member_name": "Ana Garcia",
                "payment_types": ["kyu"],
            }
        ],
        "include_club_fee": False,
    }


# ---------------------------------------------------------------------------
# POST /manual
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestPostManualPayment:
    """Tests for POST /api/v1/payments/manual."""

    def test_super_admin_creates_manual_payment_returns_201(
        self, test_app, manual_payment_payload
    ):
        """Super admin successfully registers a manual payment → 201."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case
        from src.application.use_cases.payment.register_manual_payment_use_case import (
            RegisterManualPaymentResult,
        )

        payment = _make_payment()
        member_payment = _make_member_payment()

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = RegisterManualPaymentResult(
            payment=payment,
            member_payments=[member_payment],
            invoice=None,
        )

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "payment" in data
        assert data["member_payment_count"] == 1
        assert data["invoice_number"] is None

    def test_non_super_admin_is_forbidden_403(self, test_app, manual_payment_payload):
        """Regular user (non-super-admin) trying POST /manual → 403."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_duplicate_payment_returns_409(self, test_app, manual_payment_payload):
        """DuplicatePaymentForYearError from use case → 409 Conflict."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = DuplicatePaymentForYearError(
            "member-001", "kyu", 2026
        )

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_invalid_payment_data_returns_400(self, test_app, manual_payment_payload):
        """InvalidPaymentDataError from use case → 400 Bad Request."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = InvalidPaymentDataError("Datos invalidos")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_value_error_from_use_case_returns_400(self, test_app, manual_payment_payload):
        """ValueError raised by use case → 400 Bad Request."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = ValueError("Bad value")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_response_includes_invoice_number_when_invoice_created(
        self, test_app, manual_payment_payload
    ):
        """When invoice is created, response includes invoice_number."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case
        from src.application.use_cases.payment.register_manual_payment_use_case import (
            RegisterManualPaymentResult,
        )

        payment = _make_payment()
        member_payment = _make_member_payment()

        mock_invoice = MagicMock()
        mock_invoice.invoice_number = "INV-2026-001"

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = RegisterManualPaymentResult(
            payment=payment,
            member_payments=[member_payment],
            invoice=mock_invoice,
        )

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=manual_payment_payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["invoice_number"] == "INV-2026-001"

    def test_invalid_dto_method_redsys_returns_422(self, test_app):
        """DTO validation: payment_method='redsys' rejected at validation layer → 422."""
        from src.infrastructure.web.dependencies import get_register_manual_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_register_manual_payment_use_case] = lambda: mock_use_case

        payload = {
            "payer_name": "Test",
            "club_id": "club-001",
            "payment_year": 2026,
            "payment_method": "redsys",  # invalid for manual
            "member_assignments": [
                {"member_id": "m1", "member_name": "Test", "payment_types": ["kyu"]}
            ],
        }
        client = TestClient(test_app)
        response = client.post("/api/v1/payments/manual", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ---------------------------------------------------------------------------
# PUT /{payment_id}
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestPutPayment:
    """Tests for PUT /api/v1/payments/{payment_id}."""

    def test_super_admin_updates_payment_returns_200(self, test_app):
        """Super admin can update a manual payment → 200."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        updated_payment = _make_payment(payment_id="pay-001")

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = updated_payment

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.put(
            "/api/v1/payments/pay-001",
            json={"payer_name": "Updated Name", "amount": 200.0},
        )

        assert response.status_code == status.HTTP_200_OK
        mock_use_case.execute.assert_awaited_once()

    def test_non_super_admin_update_is_forbidden_403(self, test_app):
        """Regular user trying PUT /{id} → 403."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.put("/api/v1/payments/pay-001", json={"amount": 100.0})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_update_redsys_completed_returns_409(self, test_app):
        """Redsys COMPLETED payment update → InvalidPaymentStatusError → 409."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = InvalidPaymentStatusError(
            "Los pagos completados por Redsys no son editables"
        )

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.put("/api/v1/payments/pay-redsys", json={"amount": 100.0})

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_update_nonexistent_payment_returns_404(self, test_app):
        """Payment not found → PaymentNotFoundError → 404."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = PaymentNotFoundError("pay-nonexistent")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.put("/api/v1/payments/pay-nonexistent", json={"amount": 100.0})

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_invalid_data_returns_400(self, test_app):
        """InvalidPaymentDataError → 400."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = InvalidPaymentDataError("Importe negativo")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.put("/api/v1/payments/pay-001", json={"amount": -10.0})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_passes_correct_fields_to_use_case(self, test_app):
        """PUT body fields are forwarded to use case correctly."""
        from src.infrastructure.web.dependencies import get_update_payment_use_case

        updated_payment = _make_payment(payment_id="pay-001")

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = updated_payment

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_update_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        client.put(
            "/api/v1/payments/pay-001",
            json={"payer_name": "New Name", "amount": 300.0, "payment_method": "transfer"},
        )

        call_kwargs = mock_use_case.execute.call_args.kwargs
        assert call_kwargs["payment_id"] == "pay-001"
        assert call_kwargs["payer_name"] == "New Name"
        assert call_kwargs["amount"] == 300.0
        assert call_kwargs["payment_method"] == "transfer"


# ---------------------------------------------------------------------------
# DELETE /{payment_id}
# ---------------------------------------------------------------------------

@pytest.mark.api
@pytest.mark.unit
class TestDeletePayment:
    """Tests for DELETE /api/v1/payments/{payment_id}."""

    def test_super_admin_deletes_payment_returns_204(self, test_app):
        """Super admin deletes a manual payment → 204 No Content."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-001")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_use_case.execute.assert_awaited_once_with("pay-001", force=False)

    def test_non_super_admin_delete_is_forbidden_403(self, test_app):
        """Regular user trying DELETE /{id} → 403."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        test_app.dependency_overrides[get_auth_context] = lambda: _make_regular_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-001")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_called()

    def test_delete_redsys_completed_without_force_returns_409(self, test_app):
        """Redsys COMPLETED without force → InvalidPaymentStatusError → 409."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = InvalidPaymentStatusError(
            "Los pagos completados por Redsys solo se pueden borrar con force=true"
        )

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-redsys")

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_delete_with_force_true_passes_force_flag_returns_204(self, test_app):
        """DELETE ?force=true passes force=True to use case → 204."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-redsys?force=true")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_use_case.execute.assert_awaited_once_with("pay-redsys", force=True)

    def test_delete_nonexistent_payment_returns_404(self, test_app):
        """Payment not found → PaymentNotFoundError → 404."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = PaymentNotFoundError("pay-nonexistent")

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-nonexistent")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_with_force_false_explicitly_passes_false(self, test_app):
        """DELETE ?force=false explicitly passes force=False."""
        from src.infrastructure.web.dependencies import get_delete_payment_use_case

        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = True

        test_app.dependency_overrides[get_auth_context] = lambda: _make_super_admin_ctx()
        test_app.dependency_overrides[get_delete_payment_use_case] = lambda: mock_use_case

        client = TestClient(test_app)
        response = client.delete("/api/v1/payments/pay-001?force=false")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_use_case.execute.assert_awaited_once_with("pay-001", force=False)
