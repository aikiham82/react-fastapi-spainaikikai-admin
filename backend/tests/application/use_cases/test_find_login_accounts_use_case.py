"""Tests for FindLoginAccountsUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.user import User
from src.application.use_cases.user_use_cases import FindLoginAccountsUseCase


@pytest.fixture
def mock_repository():
    """Mock user repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_by_email = AsyncMock(return_value=None)
    mock_repo.find_by_username_loose = AsyncMock(return_value=[])
    return mock_repo


@pytest.fixture
def account():
    """Account of a club."""
    return User(
        id="user123",
        email="club@example.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed"
    )


@pytest.fixture
def use_case(mock_repository):
    """Use case under test."""
    return FindLoginAccountsUseCase(mock_repository)


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestFindLoginAccountsUseCase:
    """Test suite for resolving what someone typed into accounts."""

    async def test_execute_resolves_an_email_through_the_email_lookup(
        self, use_case, mock_repository, account
    ):
        """Test that an address still resolves the way it always did."""
        # Arrange
        mock_repository.find_by_email.return_value = account

        # Act
        result = await use_case.execute("club@example.com")

        # Assert
        assert result == [account]
        mock_repository.find_by_username_loose.assert_not_awaited()

    async def test_execute_resolves_a_user_name_through_the_loose_lookup(
        self, use_case, mock_repository, account
    ):
        """Test that a club name reaches the accounts that carry it."""
        # Arrange
        mock_repository.find_by_username_loose.return_value = [account]

        # Act
        result = await use_case.execute("kuki aikikai")

        # Assert
        assert result == [account]
        mock_repository.find_by_username_loose.assert_awaited_once_with("kuki aikikai")
        mock_repository.find_by_email.assert_not_awaited()

    async def test_execute_returns_every_account_sharing_a_user_name(
        self, use_case, mock_repository
    ):
        """Test the two people in production who hold two accounts each."""
        # Arrange
        accounts = [
            User(id="a", email="alerivrod@gmail.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
            User(id="b", email="info@heijoshin.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
        ]
        mock_repository.find_by_username_loose.return_value = accounts

        # Act
        result = await use_case.execute("alejandro rivero rodriguez")

        # Assert
        assert result == accounts

    async def test_execute_returns_empty_list_for_an_unknown_identifier(
        self, use_case, mock_repository
    ):
        """Test that nothing found is an empty list, not an exception."""
        # Act
        result = await use_case.execute("nobody@example.com")

        # Assert
        assert result == []

    async def test_execute_ignores_surrounding_whitespace(
        self, use_case, mock_repository, account
    ):
        """Test that a pasted value with spaces still resolves."""
        # Arrange
        mock_repository.find_by_email.return_value = account

        # Act
        result = await use_case.execute("  club@example.com  ")

        # Assert
        assert result == [account]
        mock_repository.find_by_email.assert_awaited_once_with("club@example.com")
