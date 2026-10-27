"""Port for an external identity provider (social login)."""

from abc import ABC, abstractmethod
from typing import Optional


class IdentityProviderPort(ABC):
    """Vouches for the email behind a token issued by an external identity provider."""

    @abstractmethod
    async def verified_email(self, token: str) -> Optional[str]:
        """Return the verified email the token belongs to, or None if it cannot be trusted."""
