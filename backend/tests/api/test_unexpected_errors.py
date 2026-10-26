"""An unexpected failure answers a generic JSON 500 the browser can read, and never leaks its cause."""

import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.license import LicenseImageGenerationError
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_create_user_use_case,
    get_generate_license_image_use_case,
    get_license_use_case,
    get_process_redsys_webhook_use_case,
)

pytestmark = [pytest.mark.api]

INTERNAL_CAUSE = "connection to mongo-replica-7.internal:27017 refused"
ALLOWED_ORIGIN = "http://localhost:5173"
GENERIC_DETAIL = {"detail": "Error interno del servidor"}


def super_admin() -> AuthContext:
    user = User(
        id="user-id",
        email="admin@example.com",
        username="admin",
        hashed_password="hash",
        global_role=GlobalRole.SUPER_ADMIN,
    )
    return AuthContext(user=user, member=None)


def failing(error: Exception) -> SimpleNamespace:
    return SimpleNamespace(execute=AsyncMock(side_effect=error))


def client_with(overrides) -> TestClient:
    app = create_app()
    app.dependency_overrides = {get_auth_context: super_admin, **overrides}
    return TestClient(app, raise_server_exceptions=False)


def test_an_unexpected_failure_answers_a_generic_json_500_with_cors(caplog):
    client = client_with({
        get_license_use_case: lambda: failing(RuntimeError(INTERNAL_CAUSE)),
        get_generate_license_image_use_case: lambda: failing(RuntimeError(INTERNAL_CAUSE)),
    })

    with caplog.at_level(logging.ERROR):
        response = client.get("/api/v1/licenses/licence-id/image", headers={"Origin": ALLOWED_ORIGIN})

    assert response.status_code == 500
    assert response.json() == GENERIC_DETAIL
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert any(record.exc_info and INTERNAL_CAUSE in str(record.exc_info[1]) for record in caplog.records)


def test_a_failed_licence_image_does_not_reveal_its_cause():
    client = client_with({
        get_generate_license_image_use_case: lambda: failing(LicenseImageGenerationError(INTERNAL_CAUSE)),
    })

    response = client.get("/api/v1/licenses/licence-id/image")

    assert response.status_code == 500
    assert INTERNAL_CAUSE not in response.text


def test_a_failed_sign_up_does_not_reveal_its_cause():
    client = client_with({get_create_user_use_case: lambda: failing(RuntimeError(INTERNAL_CAUSE))})

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "ana@example.com", "username": "ana", "password": "Secreta123!"},
    )

    assert response.status_code == 500
    assert INTERNAL_CAUSE not in response.text


def test_a_failed_redsys_notification_answers_200_without_its_cause(caplog):
    client = client_with({get_process_redsys_webhook_use_case: lambda: failing(RuntimeError(INTERNAL_CAUSE))})

    with caplog.at_level(logging.ERROR):
        response = client.post(
            "/api/v1/payments/webhook",
            data={"Ds_SignatureVersion": "v1", "Ds_MerchantParameters": "e30=", "Ds_Signature": "sig"},
        )

    assert response.status_code == 200
    assert response.json()["success"] is False
    assert INTERNAL_CAUSE not in response.text
    assert any(record.exc_info for record in caplog.records)
