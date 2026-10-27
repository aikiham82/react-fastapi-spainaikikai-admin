"""Tests for the Clerk identity provider adapter."""

import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from clerk_backend_api.security import TokenVerificationError, TokenVerificationErrorReason

from src.infrastructure.adapters.services.clerk_identity_provider import ClerkIdentityProvider

MODULE = "src.infrastructure.adapters.services.clerk_identity_provider"


def _clerk_user(status):
    email = SimpleNamespace(
        id="idn_1", email_address="ana@example.com", verification=SimpleNamespace(status=status)
    )
    return SimpleNamespace(primary_email_address_id="idn_1", email_addresses=[email])


def _provider_with_user(user):
    provider = ClerkIdentityProvider(secret_key="sk_test_x", authorized_parties=["https://panel.example.com"])
    provider._clerk = SimpleNamespace(users=SimpleNamespace(get_async=AsyncMock(return_value=user)))
    return provider


@pytest.mark.unit
@pytest.mark.auth
class TestClerkIdentityProvider:
    """Test suite for ClerkIdentityProvider.verified_email."""

    async def test_vouches_for_nobody_without_a_secret_key(self):
        assert await ClerkIdentityProvider(secret_key=None, authorized_parties=None).verified_email("t") is None

    async def test_refuses_a_token_that_fails_verification(self):
        provider = _provider_with_user(_clerk_user("verified"))
        error = TokenVerificationError(TokenVerificationErrorReason.TOKEN_INVALID)

        with patch(f"{MODULE}.verify_token_async", AsyncMock(side_effect=error)):
            assert await provider.verified_email("forged") is None

    async def test_refuses_an_unverified_primary_email(self):
        provider = _provider_with_user(_clerk_user("unverified"))

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value={"sub": "user_1"})):
            assert await provider.verified_email("t") is None

    async def test_returns_the_verified_primary_email_of_an_allowed_origin(self):
        provider = _provider_with_user(_clerk_user("verified"))
        claims = {"sub": "user_1", "azp": "https://panel.example.com"}

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value=claims)):
            assert await provider.verified_email("t") == "ana@example.com"

    async def test_refuses_a_token_minted_for_another_origin(self):
        provider = _provider_with_user(_clerk_user("verified"))
        claims = {"sub": "user_1", "azp": "https://evil.example.com"}

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value=claims)):
            assert await provider.verified_email("t") is None

    async def test_accepts_a_native_app_token_which_has_no_origin(self):
        provider = _provider_with_user(_clerk_user("verified"))

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value={"sub": "user_1"})):
            assert await provider.verified_email("t") == "ana@example.com"
