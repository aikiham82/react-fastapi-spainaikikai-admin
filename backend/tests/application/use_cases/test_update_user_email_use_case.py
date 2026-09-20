"""Tests for UpdateUserEmailUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError, EmailAlreadyInUseError
from src.application.use_cases.user_use_cases import UpdateUserEmailUseCase


@pytest.fixture
def mock_repository():
    """Mock user repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_by_id = AsyncMock(return_value=None)
    mock_repo.find_by_email = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock(side_effect=lambda user: user)
    return mock_repo


@pytest.fixture
def club_account():
    """Account of a club with a broken login email."""
    return User(
        id="user123",
        email="null@jj",
        username="KUKI AIKIKAI",
        hashed_password="hashed",
        member_id="member123"
    )


@pytest.fixture
def use_case(mock_repository):
    """Use case under test."""
    return UpdateUserEmailUseCase(mock_repository)


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestUpdateUserEmailUseCase:
    """Test suite for correcting the login email of an account."""

    async def test_execute_updates_the_login_email(self, use_case, mock_repository, club_account):
        """Test that the account is persisted with the corrected address."""
        # Arrange
        mock_repository.find_by_id.return_value = club_account

        # Act
        result = await use_case.execute("user123", "leon.aikikai@gmail.com")

        # Assert
        assert result.email == "leon.aikikai@gmail.com"
        updated = mock_repository.update.call_args.args[0]
        assert updated.email == "leon.aikikai@gmail.com"

    async def test_execute_normalises_the_email(self, use_case, mock_repository, club_account):
        """Test that the stored address matches what find_by_email looks for."""
        # Arrange
        mock_repository.find_by_id.return_value = club_account

        # Act
        result = await use_case.execute("user123", "  LEON.Aikikai@Gmail.com  ")

        # Assert
        assert result.email == "leon.aikikai@gmail.com"

    async def test_execute_raises_when_another_account_holds_the_email(
        self, use_case, mock_repository, club_account
    ):
        """Test that two accounts cannot share an address, since Mongo has no unique index."""
        # Arrange
        mock_repository.find_by_id.return_value = club_account
        mock_repository.find_by_email.return_value = User(
            id="other",
            email="leon.aikikai@gmail.com",
            username="OTHER CLUB",
            hashed_password="hashed"
        )

        # Act & Assert
        with pytest.raises(EmailAlreadyInUseError):
            await use_case.execute("user123", "leon.aikikai@gmail.com")

        mock_repository.update.assert_not_awaited()

    async def test_execute_accepts_the_account_own_email(self, use_case, mock_repository, club_account):
        """Test that resaving the same address is not reported as a conflict."""
        # Arrange
        mock_repository.find_by_id.return_value = club_account
        mock_repository.find_by_email.return_value = club_account

        # Act
        result = await use_case.execute("user123", "null@jj")

        # Assert
        assert result.email == "null@jj"
        mock_repository.update.assert_awaited_once()

    async def test_execute_raises_user_not_found_error_for_unknown_id(self, use_case, mock_repository):
        """Test that an unknown account raises instead of creating one."""
        # Arrange
        mock_repository.find_by_id.return_value = None

        # Act & Assert
        with pytest.raises(UserNotFoundError):
            await use_case.execute("missing", "someone@example.com")

        mock_repository.update.assert_not_awaited()
