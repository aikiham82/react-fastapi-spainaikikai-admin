"""Tests for signing in with a user name shared by several accounts."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User
from src.infrastructure.web.dependencies import get_authenticate_user_use_case
from src.infrastructure.web.routers.users import router


@pytest.fixture
def test_app():
    """Create FastAPI test application."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def two_accounts_sharing_a_name():
    """The real production case: one person, two accounts, one user name."""
    return [
        User(id="a", email="alerivrod@gmail.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="hash-a"),
        User(id="b", email="info@heijoshin.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="hash-b"),
    ]


@pytest.mark.api
@pytest.mark.unit
class TestLoginWithUserName:
    """Test suite for POST /auth/login resolving a user name."""

    def test_signs_in_with_the_password_of_the_second_account(
        self, test_app, two_accounts_sharing_a_name
    ):
        """Test that holding the second account's password is enough.

        Resolving a shared user name to one arbitrary account would refuse a
        correct password half the time.
        """
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = two_accounts_sharing_a_name
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        with patch("src.infrastructure.web.routers.users.verify_password") as verify:
            verify.side_effect = lambda password, hashed: hashed == "hash-b"

            # Act
            response = TestClient(test_app).post(
                "/api/v1/auth/login",
                data={"username": "alejandro rivero rodriguez", "password": "the-second-one"}
            )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["access_token"]

    def test_wrong_password_is_refused(self, test_app, two_accounts_sharing_a_name):
        """Test that a password matching no account still answers 401."""
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = two_accounts_sharing_a_name
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=False):
            # Act
            response = TestClient(test_app).post(
                "/api/v1/auth/login",
                data={"username": "alejandro rivero rodriguez", "password": "wrong"}
            )

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unknown_identifier_is_refused(self, test_app):
        """Test that a name matching nothing answers 401."""
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = []
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        # Act
        response = TestClient(test_app).post(
            "/api/v1/auth/login",
            data={"username": "club que no existe", "password": "whatever"}
        )

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_inactive_account_is_refused(self, test_app):
        """Test that a deactivated account cannot sign in."""
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = [
            User(id="x", email="gone@example.com", username="OLD CLUB", hashed_password="h", is_active=False)
        ]
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=True):
            # Act
            response = TestClient(test_app).post(
                "/api/v1/auth/login",
                data={"username": "old club", "password": "right"}
            )

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
