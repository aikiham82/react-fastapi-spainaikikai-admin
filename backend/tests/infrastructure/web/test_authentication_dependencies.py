"""Tests for how a bearer token is resolved into an account."""

import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.security import create_access_token


@pytest.fixture
def account():
    """Account the email in the token currently belongs to."""
    return User(
        id="user123",
        email="club@example.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed"
    )


@pytest.fixture
def user_by_email_use_case(account):
    """Use case resolving an email to an account."""
    use_case = AsyncMock()
    use_case.execute.return_value = account
    return use_case


@pytest.mark.auth
@pytest.mark.unit
@pytest.mark.asyncio
class TestGetCurrentUser:
    """Test suite for resolving the bearer token."""

    async def test_returns_the_account_of_the_token(self, user_by_email_use_case, account):
        """Test that a token minted for an account resolves to it."""
        # Arrange
        token = create_access_token(data={"sub": account.email, "user_id": account.id})

        # Act
        result = await get_current_user(token=token, user_by_email_use_case=user_by_email_use_case)

        # Assert
        assert result == account

    async def test_rejects_a_token_whose_email_now_belongs_to_another_account(
        self, user_by_email_use_case
    ):
        """Test that reassigning an email cannot hand over a live session.

        Emails are mutable through PATCH /users/{user_id}/email. A token minted
        while an address belonged to one account must not authenticate as the
        account that holds that address later.
        """
        # Arrange
        token = create_access_token(data={"sub": "club@example.com", "user_id": "another-account"})

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, user_by_email_use_case=user_by_email_use_case)

        assert exc_info.value.status_code == 401

    async def test_accepts_a_legacy_token_without_the_user_id_claim(
        self, user_by_email_use_case, account
    ):
        """Test that tokens minted before the claim existed keep working."""
        # Arrange
        token = create_access_token(data={"sub": account.email})

        # Act
        result = await get_current_user(token=token, user_by_email_use_case=user_by_email_use_case)

        # Assert
        assert result == account

    async def test_rejects_a_token_for_an_unknown_email(self, user_by_email_use_case):
        """Test that an email with no account is refused."""
        # Arrange
        user_by_email_use_case.execute.side_effect = UserNotFoundError("email:gone@example.com")
        token = create_access_token(data={"sub": "gone@example.com", "user_id": "user123"})

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, user_by_email_use_case=user_by_email_use_case)

        assert exc_info.value.status_code == 401
