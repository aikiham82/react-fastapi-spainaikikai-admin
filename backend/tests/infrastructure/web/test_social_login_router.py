"""Tests for POST /auth/social-login."""

import pytest
from unittest.mock import AsyncMock
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from jose import jwt

from src.domain.entities.user import User
from src.infrastructure.web.dependencies import (
    get_login_with_identity_provider_use_case,
    get_member_repository,
)
from src.infrastructure.web.routers.users import router
from src.infrastructure.web.security import ALGORITHM, SECRET_KEY


@pytest.fixture
def client_returning():
    def build(user):
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        use_case = AsyncMock()
        use_case.execute.return_value = user
        app.dependency_overrides[get_login_with_identity_provider_use_case] = lambda: use_case
        app.dependency_overrides[get_member_repository] = lambda: AsyncMock()
        return TestClient(app)
    return build


@pytest.mark.api
@pytest.mark.unit
class TestSocialLogin:
    """Test suite for exchanging an identity provider token for our JWT."""

    def test_returns_our_token_for_a_known_user(self, client_returning):
        user = User(id="u1", email="ana@example.com", username="ana")

        response = client_returning(user).post("/api/v1/auth/social-login", json={"token": "clerk-token"})

        assert response.status_code == status.HTTP_200_OK
        claims = jwt.decode(response.json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
        assert claims["sub"] == "ana@example.com"
        assert claims["user_id"] == "u1"

    def test_answers_like_a_failed_password_login_when_refused(self, client_returning):
        response = client_returning(None).post("/api/v1/auth/social-login", json={"token": "forged"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json() == {"detail": "Incorrect username or password"}

    def test_rejects_an_empty_token(self, client_returning):
        response = client_returning(None).post("/api/v1/auth/social-login", json={"token": ""})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
