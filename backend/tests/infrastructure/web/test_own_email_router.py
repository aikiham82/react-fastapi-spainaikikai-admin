"""Tests for a user correcting their own login email."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User
from src.domain.exceptions.user import EmailAlreadyInUseError
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_update_user_email_use_case,
)
from src.infrastructure.web.routers.users import router
from src.infrastructure.web.security import decode_access_token


@pytest.fixture
def test_app():
    """Create FastAPI test application."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def caller():
    """The account signing the request."""
    return User(
        id="user123",
        email="director@example.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed"
    )


@pytest.fixture
def mock_use_case(caller):
    """Mock of the shared email update use case."""
    use_case = AsyncMock()
    use_case.execute.return_value = User(
        id=caller.id,
        email="club@example.com",
        username=caller.username,
        hashed_password=caller.hashed_password
    )
    return use_case


@pytest.mark.api
@pytest.mark.unit
class TestUpdateOwnEmailEndpoint:
    """Test suite for PATCH /users/me/email."""

    def test_changes_the_caller_own_email_and_keeps_the_session_alive(
        self, test_app, caller, mock_use_case
    ):
        """Test that the answer carries a token minted for the new address.

        The JWT subject is the email, so without a fresh token the caller is
        signed out the moment they fix their own address.
        """
        # Arrange
        test_app.dependency_overrides[get_auth_context] = lambda: AuthContext(user=caller)
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=True):
            # Act
            response = TestClient(test_app).patch(
                "/api/v1/users/me/email",
                json={"email": "club@example.com", "current_password": "right"}
            )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        payload = decode_access_token(response.json()["access_token"])
        assert payload["sub"] == "club@example.com"
        assert payload["user_id"] == "user123"
        mock_use_case.execute.assert_awaited_once_with("user123", "club@example.com")

    def test_wrong_current_password_changes_nothing(self, test_app, caller, mock_use_case):
        """Test that a stolen session cannot move the account to another address."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = lambda: AuthContext(user=caller)
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=False):
            # Act
            response = TestClient(test_app).patch(
                "/api/v1/users/me/email",
                json={"email": "attacker@example.com", "current_password": "guess"}
            )

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_use_case.execute.assert_not_awaited()

    def test_email_of_another_account_returns_409(self, test_app, caller, mock_use_case):
        """Test that taking over another account's address is refused."""
        # Arrange
        mock_use_case.execute.side_effect = EmailAlreadyInUseError("taken@example.com")
        test_app.dependency_overrides[get_auth_context] = lambda: AuthContext(user=caller)
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=True):
            # Act
            response = TestClient(test_app).patch(
                "/api/v1/users/me/email",
                json={"email": "taken@example.com", "current_password": "right"}
            )

        # Assert
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_malformed_email_is_rejected(self, test_app, caller, mock_use_case):
        """Test that the boundary still validates the address format."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = lambda: AuthContext(user=caller)
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/me/email",
            json={"email": "null@jj", "current_password": "right"}
        )

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_me_is_not_read_as_a_user_id(self, test_app, caller, mock_use_case):
        """Test that the route wins over the super-admin /users/{user_id}/email."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = lambda: AuthContext(user=caller)
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=True):
            # Act
            response = TestClient(test_app).patch(
                "/api/v1/users/me/email",
                json={"email": "club@example.com", "current_password": "right"}
            )

        # Assert: a club admin reaching the super-admin route would get a 403
        assert response.status_code == status.HTTP_200_OK
