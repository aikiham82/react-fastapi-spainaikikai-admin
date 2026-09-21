"""Tests for the super admin account support endpoints."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.user import User, GlobalRole
from src.domain.entities.member import Member, ClubRole
from src.domain.exceptions.user import UserNotFoundError
from src.application.use_cases.password_reset import AdminPasswordResetLinkResult
from src.infrastructure.web.authorization import AuthContext
from src.domain.exceptions.user import EmailAlreadyInUseError
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_all_users_use_case,
    get_generate_admin_password_reset_link_use_case,
    get_user_by_member_id_use_case,
    get_update_user_email_use_case,
)
from src.infrastructure.web.routers.users import router


@pytest.fixture
def test_app():
    """Create FastAPI test application."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def mock_use_case():
    """Mock the link generation use case."""
    use_case = AsyncMock()
    use_case.execute.return_value = AdminPasswordResetLinkResult(
        url="https://admin.spainaikikai.es/reset-password?token=abc123",
        email="club@example.com",
        expires_at=datetime(2026, 9, 21, 12, 0, 0)
    )
    return use_case


def super_admin_context() -> AuthContext:
    """Authentication context for a super admin."""
    return AuthContext(
        user=User(
            id="admin1",
            email="admin@spainaikikai.org",
            username="Admin",
            global_role=GlobalRole.SUPER_ADMIN
        )
    )


def club_admin_context() -> AuthContext:
    """Authentication context for a club admin."""
    return AuthContext(
        user=User(
            id="user1",
            email="club@example.com",
            username="KUKI AIKIKAI",
            member_id="member1"
        ),
        member=Member(
            id="member1",
            first_name="Kuki Aikikai",
            last_name="(Club Admin)",
            club_id="club1",
            club_role=ClubRole.ADMIN
        )
    )


@pytest.mark.api
@pytest.mark.unit
class TestGenerateAdminPasswordResetLinkEndpoint:
    """Test suite for POST /users/{user_id}/password-reset-link."""

    def test_super_admin_gets_the_link_for_the_account(self, test_app, mock_use_case):
        """Test that a super admin receives the link, the login email and the expiry."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_generate_admin_password_reset_link_use_case] = lambda: mock_use_case

        # Act
        response = TestClient(test_app).post("/api/v1/users/user123/password-reset-link")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["url"] == "https://admin.spainaikikai.es/reset-password?token=abc123"
        assert response.json()["email"] == "club@example.com"
        mock_use_case.execute.assert_awaited_once_with("user123", issued_by="admin1")

    def test_club_admin_is_forbidden(self, test_app, mock_use_case):
        """Test that a club admin cannot issue links, not even for their own account."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = club_admin_context
        test_app.dependency_overrides[get_generate_admin_password_reset_link_use_case] = lambda: mock_use_case

        # Act
        response = TestClient(test_app).post("/api/v1/users/user1/password-reset-link")

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_use_case.execute.assert_not_awaited()

    def test_unknown_user_returns_404(self, test_app, mock_use_case):
        """Test that an unknown account id is reported as not found."""
        # Arrange
        mock_use_case.execute.side_effect = UserNotFoundError("missing")
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_generate_admin_password_reset_link_use_case] = lambda: mock_use_case

        # Act
        response = TestClient(test_app).post("/api/v1/users/missing/password-reset-link")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.fixture
def mock_by_member_use_case():
    """Mock the member lookup use case."""
    use_case = AsyncMock()
    use_case.execute.return_value = User(
        id="user123",
        email="club@example.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed",
        member_id="member123"
    )
    return use_case


@pytest.mark.api
@pytest.mark.unit
class TestGetUserByMemberEndpoint:
    """Test suite for GET /users/by-member/{member_id}."""

    def test_super_admin_gets_the_account_of_a_member(self, test_app, mock_by_member_use_case):
        """Test that the login email of a member's account is readable by a super admin."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_user_by_member_id_use_case] = lambda: mock_by_member_use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users/by-member/member123")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "club@example.com"
        mock_by_member_use_case.execute.assert_awaited_once_with("member123")

    def test_club_admin_is_forbidden(self, test_app, mock_by_member_use_case):
        """Test that a club admin cannot read login emails."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = club_admin_context
        test_app.dependency_overrides[get_user_by_member_id_use_case] = lambda: mock_by_member_use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users/by-member/member1")

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_by_member_use_case.execute.assert_not_awaited()

    def test_account_with_an_unusable_email_is_still_readable(self, test_app, mock_by_member_use_case):
        """Test that the accounts most in need of support do not break the response."""
        # Arrange
        mock_by_member_use_case.execute.return_value = User(
            id="user456",
            email="pendiente de admision",
            username="JUDO CLUB VALLES",
            hashed_password="hashed",
            member_id="member456"
        )
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_user_by_member_id_use_case] = lambda: mock_by_member_use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users/by-member/member456")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "pendiente de admision"

    def test_member_without_account_returns_404(self, test_app, mock_by_member_use_case):
        """Test that a member with no login account is reported as not found."""
        # Arrange
        mock_by_member_use_case.execute.side_effect = UserNotFoundError("member:member999")
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_user_by_member_id_use_case] = lambda: mock_by_member_use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users/by-member/member999")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.api
@pytest.mark.unit
class TestListUsersEndpoint:
    """Test suite for GET /users."""

    def test_club_admin_cannot_list_every_account(self, test_app):
        """Test that the account list, which exposes every login email, is gated.

        This branch gates a single login email behind super admin. Leaving the
        whole list readable by any authenticated caller would make that pointless.
        """
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = []
        test_app.dependency_overrides[get_auth_context] = club_admin_context
        test_app.dependency_overrides[get_all_users_use_case] = lambda: use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users")

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        use_case.execute.assert_not_awaited()

    def test_super_admin_lists_every_account(self, test_app):
        """Test that a super admin still gets the list."""
        # Arrange
        use_case = AsyncMock()
        use_case.execute.return_value = []
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_all_users_use_case] = lambda: use_case

        # Act
        response = TestClient(test_app).get("/api/v1/users")

        # Assert
        assert response.status_code == status.HTTP_200_OK


@pytest.fixture
def mock_update_email_use_case():
    """Mock the email correction use case."""
    use_case = AsyncMock()
    use_case.execute.return_value = User(
        id="user123",
        email="leon.aikikai@gmail.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed",
        member_id="member123"
    )
    return use_case


@pytest.mark.api
@pytest.mark.unit
class TestUpdateUserEmailEndpoint:
    """Test suite for PATCH /users/{user_id}/email."""

    def test_super_admin_corrects_the_login_email(self, test_app, mock_update_email_use_case):
        """Test that the account comes back with the corrected address."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_update_email_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/user123/email",
            json={"email": "leon.aikikai@gmail.com"}
        )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "leon.aikikai@gmail.com"
        mock_update_email_use_case.execute.assert_awaited_once_with("user123", "leon.aikikai@gmail.com")

    def test_club_admin_is_forbidden(self, test_app, mock_update_email_use_case):
        """Test that a club admin cannot change any login email."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = club_admin_context
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_update_email_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/user1/email",
            json={"email": "other@example.com"}
        )

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_update_email_use_case.execute.assert_not_awaited()

    def test_email_of_another_account_returns_409(self, test_app, mock_update_email_use_case):
        """Test that reusing another account's address is reported as a conflict."""
        # Arrange
        mock_update_email_use_case.execute.side_effect = EmailAlreadyInUseError("taken@example.com")
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_update_email_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/user123/email",
            json={"email": "taken@example.com"}
        )

        # Assert
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_unknown_user_returns_404(self, test_app, mock_update_email_use_case):
        """Test that an unknown account id is reported as not found."""
        # Arrange
        mock_update_email_use_case.execute.side_effect = UserNotFoundError("missing")
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_update_email_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/missing/email",
            json={"email": "someone@example.com"}
        )

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_malformed_email_is_rejected(self, test_app, mock_update_email_use_case):
        """Test that the boundary still validates the address format."""
        # Arrange
        test_app.dependency_overrides[get_auth_context] = super_admin_context
        test_app.dependency_overrides[get_update_user_email_use_case] = lambda: mock_update_email_use_case

        # Act
        response = TestClient(test_app).patch(
            "/api/v1/users/user123/email",
            json={"email": "null@jj"}
        )

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        mock_update_email_use_case.execute.assert_not_awaited()
