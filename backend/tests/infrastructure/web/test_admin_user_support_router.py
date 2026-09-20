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
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_generate_admin_password_reset_link_use_case,
    get_user_by_member_id_use_case,
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
        mock_use_case.execute.assert_awaited_once_with("user123")

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
