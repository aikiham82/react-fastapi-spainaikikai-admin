"""Tests for GenerateAdminPasswordResetLinkUseCase."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.user import User
from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.exceptions.user import UserNotFoundError
from src.application.use_cases.password_reset import GenerateAdminPasswordResetLinkUseCase


@pytest.fixture
def mock_user_repository():
    """Mock user repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_by_id = AsyncMock(return_value=None)
    return mock_repo


@pytest.fixture
def mock_token_repository():
    """Mock password reset token repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.invalidate_user_tokens = AsyncMock(return_value=0)
    mock_repo.create = AsyncMock(side_effect=lambda token: token)
    return mock_repo


@pytest.fixture
def club_user():
    """User entity for a club account."""
    return User(
        id="user123",
        email="club@example.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed",
        member_id="member123"
    )


@pytest.fixture
def use_case(mock_user_repository, mock_token_repository):
    """Use case under test."""
    return GenerateAdminPasswordResetLinkUseCase(
        user_repository=mock_user_repository,
        token_repository=mock_token_repository,
        frontend_base_url="https://admin.spainaikikai.es/"
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestGenerateAdminPasswordResetLinkUseCase:
    """Test suite for generating a password reset link on behalf of an account."""

    async def test_execute_returns_url_with_the_created_token(
        self, use_case, mock_user_repository, mock_token_repository, club_user
    ):
        """Test that the returned URL points at the reset page with the new token."""
        # Arrange
        mock_user_repository.find_by_id.return_value = club_user

        # Act
        result = await use_case.execute("user123")

        # Assert
        created_token = mock_token_repository.create.call_args.args[0]
        assert result.url == f"https://admin.spainaikikai.es/reset-password?token={created_token.token}"

    async def test_execute_invalidates_previous_tokens_before_creating_one(
        self, use_case, mock_user_repository, mock_token_repository, club_user
    ):
        """Test that older links stop working as soon as a new one is handed out."""
        # Arrange
        mock_user_repository.find_by_id.return_value = club_user

        # Act
        await use_case.execute("user123")

        # Assert
        mock_token_repository.invalidate_user_tokens.assert_awaited_once_with("user123")
        assert mock_token_repository.create.await_count == 1

    async def test_execute_persists_the_token_with_the_account_login_email(
        self, use_case, mock_user_repository, mock_token_repository, club_user
    ):
        """Test that the token carries the account's own email, not one supplied by the caller."""
        # Arrange
        mock_user_repository.find_by_id.return_value = club_user

        # Act
        result = await use_case.execute("user123")

        # Assert
        created_token = mock_token_repository.create.call_args.args[0]
        assert isinstance(created_token, PasswordResetToken)
        assert created_token.user_id == "user123"
        assert created_token.email == "club@example.com"
        assert result.email == "club@example.com"

    async def test_execute_returns_expiration_24_hours_ahead(
        self, use_case, mock_user_repository, club_user
    ):
        """Test that the caller can tell the club how long the link lasts."""
        # Arrange
        mock_user_repository.find_by_id.return_value = club_user
        before = datetime.utcnow()

        # Act
        result = await use_case.execute("user123")

        # Assert
        assert result.expires_at >= before + timedelta(hours=23, minutes=59)
        assert result.expires_at <= datetime.utcnow() + timedelta(hours=24)

    async def test_execute_works_for_an_account_with_an_unusable_email(
        self, use_case, mock_user_repository, mock_token_repository
    ):
        """Test that migrated accounts with a broken email still get a link."""
        # Arrange
        mock_user_repository.find_by_id.return_value = User(
            id="user456",
            email="null@jj",
            username="FRANCISCO BAÑEZ SANCHEZ",
            hashed_password="hashed"
        )

        # Act
        result = await use_case.execute("user456")

        # Assert
        assert "reset-password?token=" in result.url
        assert result.email == "null@jj"

    async def test_execute_raises_user_not_found_error_for_unknown_id(
        self, use_case, mock_user_repository, mock_token_repository
    ):
        """Test that an unknown account raises instead of creating a dangling token."""
        # Arrange
        mock_user_repository.find_by_id.return_value = None

        # Act & Assert
        with pytest.raises(UserNotFoundError):
            await use_case.execute("missing")

        mock_token_repository.create.assert_not_awaited()
