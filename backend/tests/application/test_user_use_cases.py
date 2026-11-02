from typing import Optional

"""Tests for User use cases."""

import pytest
from unittest.mock import AsyncMock

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError
from src.application.use_cases.user_use_cases import (
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
    GetUserByMemberIdUseCase,
    FindLoginAccountsUseCase,
    AuthenticateUserUseCase
)


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestGetAllUsersUseCase:
    """Test suite for GetAllUsersUseCase."""

    async def test_execute_returns_all_users_from_repository(self, mock_user_repository, test_users_list):
        """Test that execute returns all users from repository."""
        # Arrange
        mock_user_repository.find_all.return_value = test_users_list
        use_case = GetAllUsersUseCase(mock_user_repository)
        
        # Act
        result = await use_case.execute()
        
        # Assert
        assert result == test_users_list
        mock_user_repository.find_all.assert_called_once_with(0)  # Default limit

    async def test_execute_with_custom_limit_passes_limit_to_repository(self, mock_user_repository, test_users_list):
        """Test that execute passes custom limit to repository."""
        # Arrange
        custom_limit = 50
        expected_users = test_users_list[:2]  # Simulate limited results
        mock_user_repository.find_all.return_value = expected_users
        use_case = GetAllUsersUseCase(mock_user_repository)
        
        # Act
        result = await use_case.execute(custom_limit)
        
        # Assert
        assert result == expected_users
        mock_user_repository.find_all.assert_called_once_with(custom_limit)

    async def test_execute_returns_empty_list_when_no_users_exist(self, mock_user_repository):
        """Test that execute returns empty list when no users exist."""
        # Arrange
        mock_user_repository.find_all.return_value = []
        use_case = GetAllUsersUseCase(mock_user_repository)
        
        # Act
        result = await use_case.execute()
        
        # Assert
        assert result == []
        mock_user_repository.find_all.assert_called_once_with(0)

    async def test_execute_propagates_repository_exceptions(self, mock_user_repository):
        """Test that execute propagates repository exceptions."""
        # Arrange
        repository_error = Exception("Database connection failed")
        mock_user_repository.find_all.side_effect = repository_error
        use_case = GetAllUsersUseCase(mock_user_repository)
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute()
        
        assert str(exc_info.value) == "Database connection failed"


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestGetUserByIdUseCase:
    """Test suite for GetUserByIdUseCase."""

    async def test_execute_returns_user_when_found(self, mock_user_repository, user_entity_with_id):
        """Test that execute returns user when found by ID."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_user_repository.find_by_id.return_value = user_entity_with_id
        use_case = GetUserByIdUseCase(mock_user_repository)
        
        # Act
        result = await use_case.execute(user_id)
        
        # Assert
        assert result == user_entity_with_id
        mock_user_repository.find_by_id.assert_called_once_with(user_id)

    async def test_execute_raises_user_not_found_error_when_user_not_found(self, mock_user_repository):
        """Test that execute raises UserNotFoundError when user not found."""
        # Arrange
        user_id = "nonexistent_id"
        mock_user_repository.find_by_id.return_value = None
        use_case = GetUserByIdUseCase(mock_user_repository)
        
        # Act & Assert
        with pytest.raises(UserNotFoundError) as exc_info:
            await use_case.execute(user_id)
        
        assert exc_info.value.entity_id == user_id
        mock_user_repository.find_by_id.assert_called_once_with(user_id)

    async def test_execute_propagates_repository_exceptions(self, mock_user_repository):
        """Test that execute propagates repository exceptions."""
        # Arrange
        user_id = "test_id"
        repository_error = Exception("Database error")
        mock_user_repository.find_by_id.side_effect = repository_error
        use_case = GetUserByIdUseCase(mock_user_repository)
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(user_id)
        
        assert str(exc_info.value) == "Database error"


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestGetUserByMemberIdUseCase:
    """Test suite for GetUserByMemberIdUseCase."""

    async def test_execute_returns_the_account_linked_to_the_member(
        self, mock_user_repository, user_entity_with_id
    ):
        """Test that execute returns the login account a member is linked to."""
        # Arrange
        mock_user_repository.find_by_member_id.return_value = user_entity_with_id
        use_case = GetUserByMemberIdUseCase(mock_user_repository)

        # Act
        result = await use_case.execute("member123")

        # Assert
        assert result == user_entity_with_id
        mock_user_repository.find_by_member_id.assert_called_once_with("member123")

    async def test_execute_raises_user_not_found_error_when_member_has_no_account(
        self, mock_user_repository
    ):
        """Test that a member without a login account raises UserNotFoundError."""
        # Arrange
        mock_user_repository.find_by_member_id.return_value = None
        use_case = GetUserByMemberIdUseCase(mock_user_repository)

        # Act & Assert
        with pytest.raises(UserNotFoundError):
            await use_case.execute("member123")


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestGetUserByEmailUseCase:
    """Test suite for GetUserByEmailUseCase."""

    async def test_execute_returns_user_when_found_by_email(self, mock_user_repository, user_entity_with_id):
        """Test that execute returns user when found by email."""
        # Arrange
        email = "test@example.com"
        mock_user_repository.find_by_email.return_value = user_entity_with_id
        use_case = GetUserByEmailUseCase(mock_user_repository)
        
        # Act
        result = await use_case.execute(email)
        
        # Assert
        assert result == user_entity_with_id
        mock_user_repository.find_by_email.assert_called_once_with(email)

    async def test_execute_raises_user_not_found_error_when_user_not_found(self, mock_user_repository):
        """Test that execute raises UserNotFoundError with email identifier when user not found."""
        # Arrange
        email = "nonexistent@example.com"
        mock_user_repository.find_by_email.return_value = None
        use_case = GetUserByEmailUseCase(mock_user_repository)
        
        # Act & Assert
        with pytest.raises(UserNotFoundError) as exc_info:
            await use_case.execute(email)
        
        assert exc_info.value.entity_id == f"email:{email}"
        mock_user_repository.find_by_email.assert_called_once_with(email)

    async def test_execute_propagates_repository_exceptions(self, mock_user_repository):
        """Test that execute propagates repository exceptions."""
        # Arrange
        email = "test@example.com"
        repository_error = Exception("Database connection failed")
        mock_user_repository.find_by_email.side_effect = repository_error
        use_case = GetUserByEmailUseCase(mock_user_repository)
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(email)
        
        assert str(exc_info.value) == "Database connection failed"




@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestAuthenticateUserUseCase:
    """Test suite for AuthenticateUserUseCase."""

    async def test_execute_returns_every_account_the_identifier_resolves_to(
        self, mock_user_repository, user_entity_with_id
    ):
        """Test that the caller receives all candidates, not one arbitrary account.

        A user name can belong to more than one account, and only the password
        tells them apart, so the decision belongs to the web layer.
        """
        # Arrange
        find_login_accounts = FindLoginAccountsUseCase(mock_user_repository)
        mock_user_repository.find_by_username_loose.return_value = [user_entity_with_id]
        use_case = AuthenticateUserUseCase(find_login_accounts)

        # Act
        result = await use_case.execute("testuser")

        # Assert
        assert result == [user_entity_with_id]

    async def test_execute_resolves_an_email(self, mock_user_repository, user_entity_with_id):
        """Test that an address still signs in."""
        # Arrange
        find_login_accounts = FindLoginAccountsUseCase(mock_user_repository)
        mock_user_repository.find_by_email.return_value = user_entity_with_id
        use_case = AuthenticateUserUseCase(find_login_accounts)

        # Act
        result = await use_case.execute("test@example.com")

        # Assert
        assert result == [user_entity_with_id]

    async def test_execute_returns_empty_list_when_nothing_matches(self, mock_user_repository):
        """Test that an unknown identifier yields no candidates."""
        # Arrange
        find_login_accounts = FindLoginAccountsUseCase(mock_user_repository)
        use_case = AuthenticateUserUseCase(find_login_accounts)

        # Act
        result = await use_case.execute("nonexistent")

        # Assert
        assert result == []

    async def test_execute_propagates_repository_exceptions(self, mock_user_repository):
        """Test that a broken database is not silently read as a bad password."""
        # Arrange
        mock_user_repository.find_by_username_loose.side_effect = Exception("Database connection failed")
        use_case = AuthenticateUserUseCase(FindLoginAccountsUseCase(mock_user_repository))

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute("testuser")

        assert str(exc_info.value) == "Database connection failed"



@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestUserUseCasesIntegration:
    """Integration tests for user use cases interaction."""


