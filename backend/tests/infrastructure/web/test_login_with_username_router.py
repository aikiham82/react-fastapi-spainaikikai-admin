"""Tests for signing in with a user name shared by several accounts."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User
from src.infrastructure.web.dependencies import get_authenticate_user_use_case
from src.infrastructure.web.routers.users import router, MAX_LOGIN_CANDIDATES


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
        User(id="a", email="personal@example.com", username="NOMBRE REPETIDO", hashed_password="hash-a"),
        User(id="b", email="club@example.com", username="NOMBRE REPETIDO", hashed_password="hash-b"),
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
                data={"username": "nombre repetido", "password": "the-second-one"}
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
                data={"username": "nombre repetido", "password": "wrong"}
            )

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_an_inactive_account_never_shadows_an_active_one(self, test_app):
        """Test that a disabled twin cannot deny the real account its login.

        Candidates come back in Mongo natural order, so whichever matched
        first would otherwise decide the answer.
        """
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = [
            User(id="old", email="old@example.com", username="SAME NAME", hashed_password="hash", is_active=False),
            User(id="new", email="new@example.com", username="SAME NAME", hashed_password="hash", is_active=True),
        ]
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=True):
            # Act
            response = TestClient(test_app).post(
                "/api/v1/auth/login",
                data={"username": "same name", "password": "shared"}
            )

        # Assert
        assert response.status_code == status.HTTP_200_OK

    def test_only_a_bounded_number_of_passwords_is_checked(self, test_app):
        """Test that planted look-alike accounts cannot turn a login into work.

        Registration is open, user names are matched loosely, and each check
        is a bcrypt hash that blocks the event loop.
        """
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = [
            User(id=str(n), email=f"{n}@example.com", username="KUKI AIKIKAI", hashed_password="hash")
            for n in range(50)
        ]
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: use_case

        with patch("src.infrastructure.web.routers.users.verify_password", return_value=False) as verify:
            # Act
            response = TestClient(test_app).post(
                "/api/v1/auth/login",
                data={"username": "kuki aikikai", "password": "wrong"}
            )

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert verify.call_count <= MAX_LOGIN_CANDIDATES

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
        """Test that a deactivated account cannot sign in.

        The answer is the same 401 as a wrong password, so confirming a
        password no longer tells an attacker the account exists but is off.
        """
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
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
