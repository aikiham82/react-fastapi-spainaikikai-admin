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


def _provider_with_user(user, authorized_parties=("https://panel.example.com",), jwt_key=None):
    provider = ClerkIdentityProvider(
        secret_key="sk_test_x", authorized_parties=list(authorized_parties), jwt_key=jwt_key
    )
    provider._clerk = SimpleNamespace(users=SimpleNamespace(get_async=AsyncMock(return_value=user)))
    return provider


@pytest.mark.unit
@pytest.mark.auth
class TestClerkIdentityProviderHardening:
    """Only session tokens of our origins count, and outages are told apart from bad tokens."""

    async def test_refuses_a_non_session_token_without_asking_clerk(self):
        provider = _provider_with_user(_clerk_user("verified"))

        with patch(f"{MODULE}.verify_token_async", AsyncMock()) as verify:
            assert await provider.verified_email("ak_machine_key") is None

        verify.assert_not_awaited()

    async def test_refuses_any_named_origin_when_no_allowlist_is_configured(self):
        provider = _provider_with_user(_clerk_user("verified"), authorized_parties=())
        claims = {"sub": "user_1", "azp": "https://panel.example.com"}

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value=claims)):
            assert await provider.verified_email("t") is None

    async def test_refuses_an_impersonation_token(self):
        provider = _provider_with_user(_clerk_user("verified"))
        claims = {"sub": "user_1", "act": {"sub": "user_admin"}}

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value=claims)):
            assert await provider.verified_email("t") is None

    async def test_refuses_a_non_ascii_email(self):
        user = _clerk_user("verified")
        user.email_addresses[0].email_address = "vic​tim@example.com"
        provider = _provider_with_user(user)

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value={"sub": "user_1"})):
            assert await provider.verified_email("t") is None

    async def test_verifies_offline_with_the_jwt_key_when_configured(self):
        provider = _provider_with_user(_clerk_user("verified"), jwt_key="-----BEGIN PUBLIC KEY-----")

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value={"sub": "user_1"})) as verify:
            await provider.verified_email("t")

        assert verify.await_args.args[1].jwt_key == "-----BEGIN PUBLIC KEY-----"

    async def test_reports_a_failing_clerk_as_an_error_not_as_a_bad_token(self, caplog):
        provider = _provider_with_user(None)
        provider._clerk.users.get_async.side_effect = RuntimeError("401 from Clerk")

        with patch(f"{MODULE}.verify_token_async", AsyncMock(return_value={"sub": "user_1"})):
            assert await provider.verified_email("t") is None

        assert any(record.levelname == "ERROR" for record in caplog.records)


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
