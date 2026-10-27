"""Clerk implementation of the identity provider port."""

import logging
from typing import List, Optional

from clerk_backend_api import Clerk
from clerk_backend_api.security import TokenVerificationError, VerifyTokenOptions, verify_token_async
from clerk_backend_api.security.machine import get_token_type
from clerk_backend_api.security.types import TokenType

from src.application.ports.identity_provider import IdentityProviderPort

logger = logging.getLogger(__name__)


class ClerkIdentityProvider(IdentityProviderPort):
    """Verifies a Clerk session token and reads the user's primary email from Clerk.

    The session token carries no email, so the user is fetched; that also tells
    whether the email was verified, which is what makes it safe to match on.
    """

    def __init__(
        self,
        secret_key: Optional[str],
        authorized_parties: Optional[List[str]],
        jwt_key: Optional[str] = None,
    ):
        self._secret_key = secret_key
        self._authorized_parties = authorized_parties or []
        self._jwt_key = jwt_key
        self._clerk = Clerk(bearer_auth=secret_key) if secret_key else None

    async def verified_email(self, token: str) -> Optional[str]:
        if not self._clerk or get_token_type(token) != TokenType.SESSION_TOKEN:
            return None
        try:
            claims = await verify_token_async(
                token, VerifyTokenOptions(secret_key=self._secret_key, jwt_key=self._jwt_key)
            )
        except TokenVerificationError as error:
            logger.warning("Clerk token refused: %s", error.reason)
            return None
        except Exception as error:
            logger.error("Clerk token check failed, check the Clerk keys: %s", type(error).__name__)
            return None
        if not self._is_native_or_allowed_origin(claims.get("azp")):
            return None

        try:
            user = await self._clerk.users.get_async(user_id=claims["sub"])
        except Exception as error:
            logger.error("Clerk user lookup failed, check CLERK_SECRET_KEY: %s", type(error).__name__)
            return None

        primary = next(
            (email for email in user.email_addresses if email.id == user.primary_email_address_id),
            None,
        )
        if primary and primary.verification and primary.verification.status == "verified":
            return primary.email_address
        return None

    def _is_native_or_allowed_origin(self, azp: Optional[str]) -> bool:
        return azp is None or azp in self._authorized_parties
