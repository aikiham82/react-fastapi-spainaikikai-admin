"""Repository port interface for PasswordResetToken domain."""

from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

from src.domain.entities.password_reset_token import PasswordResetToken


class PasswordResetTokenRepositoryPort(ABC):
    """Port for password reset token repository operations."""

    @abstractmethod
    async def find_by_token(self, token: str) -> Optional[PasswordResetToken]:
        """Find a password reset token by its token string.

        Args:
            token: The token string to search for.

        Returns:
            The PasswordResetToken if found, None otherwise.
        """
        pass

    @abstractmethod
    async def find_by_user_id(self, user_id: str) -> Optional[PasswordResetToken]:
        """Find the most recent active (not used, not expired) token for a user.

        Args:
            user_id: The user ID to search for.

        Returns:
            The most recent active PasswordResetToken if found, None otherwise.
        """
        pass

    @abstractmethod
    async def create(self, token: PasswordResetToken) -> PasswordResetToken:
        """Create a new password reset token.

        Args:
            token: The PasswordResetToken entity to create.

        Returns:
            The created PasswordResetToken with assigned ID.
        """
        pass

    @abstractmethod
    async def update(self, token: PasswordResetToken) -> PasswordResetToken:
        """Update an existing password reset token.

        Args:
            token: The PasswordResetToken entity to update.

        Returns:
            The updated PasswordResetToken.
        """
        pass

    @abstractmethod
    async def invalidate_user_tokens(self, user_id: str) -> int:
        """Invalidate all active tokens for a user.

        This is called when a new password reset is requested,
        ensuring only the latest token is valid.

        Args:
            user_id: The user ID whose tokens should be invalidated.

        Returns:
            The number of tokens that were invalidated.
        """
        pass

    @abstractmethod
    async def delete_expired(self) -> int:
        """Delete all expired tokens from the database.

        This can be called periodically for cleanup.

        Returns:
            The number of tokens that were deleted.
        """
        pass

    @abstractmethod
    async def count_recent_requests(
        self,
        email: str,
        since: datetime
    ) -> int:
        """Count the number of password reset requests for an email since a given time.

        This is used for rate limiting.

        Args:
            email: The email address to check.
            since: Count requests created after this datetime.

        Returns:
            The number of requests since the given time.
        """
        pass
