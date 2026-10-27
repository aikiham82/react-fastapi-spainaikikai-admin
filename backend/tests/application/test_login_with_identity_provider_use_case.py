"""Tests for signing in with an external identity provider."""

import pytest
from unittest.mock import AsyncMock

from src.application.use_cases.user_use_cases import LoginWithIdentityProviderUseCase
from src.domain.entities.user import User


def _use_case(email, user):
    identity_provider = AsyncMock()
    identity_provider.verified_email.return_value = email
    user_repository = AsyncMock()
    user_repository.find_by_email.return_value = user
    return LoginWithIdentityProviderUseCase(identity_provider, user_repository), user_repository


@pytest.mark.unit
@pytest.mark.auth
class TestLoginWithIdentityProviderUseCase:
    """Test suite for LoginWithIdentityProviderUseCase."""

    async def test_returns_the_active_user_of_the_verified_email(self):
        user = User(id="u1", email="ana@example.com", username="ana")
        use_case, user_repository = _use_case("ana@example.com", user)

        assert await use_case.execute("clerk-token") == user
        user_repository.find_by_email.assert_awaited_once_with("ana@example.com")

    async def test_refuses_an_email_without_account(self):
        use_case, _ = _use_case("nobody@example.com", None)

        assert await use_case.execute("clerk-token") is None

    async def test_refuses_an_inactive_user(self):
        user = User(id="u1", email="ana@example.com", username="ana", is_active=False)
        use_case, _ = _use_case("ana@example.com", user)

        assert await use_case.execute("clerk-token") is None

    async def test_refuses_a_token_the_provider_does_not_vouch_for(self):
        use_case, user_repository = _use_case(None, None)

        assert await use_case.execute("forged") is None
        user_repository.find_by_email.assert_not_awaited()
