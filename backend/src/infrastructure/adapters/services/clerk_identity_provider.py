"""Clerk implementation of the identity provider port."""

import logging
from typing import List, Optional

from clerk_backend_api import Clerk
from clerk_backend_api.security import VerifyTokenOptions, verify_token_async

from src.application.ports.identity_provider import IdentityProviderPort

logger = logging.getLogger(__name__)


class ClerkIdentityProvider(IdentityProviderPort):
    """Verifies a Clerk session token and reads the user's primary email from Clerk.

    The session token carries no email, so the user is fetched; that also tells
    whether the email was verified, which is what makes it safe to match on.
    """

    def __init__(self, secret_key: Optional[str], authorized_parties: Optional[List[str]]):
        self._secret_key = secret_key
        self._authorized_parties = authorized_parties
        self._clerk = Clerk(bearer_auth=secret_key) if secret_key else None

    async def verified_email(self, token: str) -> Optional[str]:
        if not self._clerk:
            return None
        try:
            claims = await verify_token_async(token, VerifyTokenOptions(secret_key=self._secret_key))
            if not self._origin_allowed(claims.get("azp")):
                return None
            user = await self._clerk.users.get_async(user_id=claims["sub"])
        except Exception as error:
            logger.warning("Clerk token refused: %s", type(error).__name__)
            return None

        primary = next(
            (email for email in user.email_addresses if email.id == user.primary_email_address_id),
            None,
        )
        if primary and primary.verification and primary.verification.status == "verified":
            return primary.email_address
        return None

    def _origin_allowed(self, azp: Optional[str]) -> bool:
        # The SDK refuses a token without azp, but the native mobile app has no
        # origin to put there; a token that does name an origin must be ours.
        return azp is None or not self._authorized_parties or azp in self._authorized_parties
