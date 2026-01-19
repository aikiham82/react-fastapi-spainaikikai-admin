"""Password reset token domain entity."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import secrets


@dataclass
class PasswordResetToken:
    """Password reset token domain entity.

    Tokens are single-use and expire after 24 hours by default.
    Uses cryptographically secure token generation.
    """

    id: Optional[str] = None
    user_id: str = ""
    token: str = ""
    email: str = ""
    expires_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Token expiration time in hours
    TOKEN_EXPIRATION_HOURS: int = 24

    def __post_init__(self):
        """Initialize token with validation and defaults."""
        self.created_at = self.created_at or datetime.utcnow()

        # Set expiration if not provided
        if self.expires_at is None:
            self.expires_at = self.created_at + timedelta(hours=self.TOKEN_EXPIRATION_HOURS)

        # Generate secure token if not provided
        if not self.token:
            self.token = self._generate_secure_token()

        # Validate required fields
        if not self.user_id:
            raise ValueError("User ID is required for password reset token")
        if not self.email:
            raise ValueError("Email is required for password reset token")

    @staticmethod
    def _generate_secure_token() -> str:
        """Generate a cryptographically secure URL-safe token.

        Returns:
            A 43-character URL-safe base64 string (256 bits of entropy).
        """
        return secrets.token_urlsafe(32)

    @property
    def is_expired(self) -> bool:
        """Check if the token has expired.

        Returns:
            True if current time is past expiration time.
        """
        if self.expires_at is None:
            return True
        return datetime.utcnow() > self.expires_at

    @property
    def is_used(self) -> bool:
        """Check if the token has already been used.

        Returns:
            True if used_at timestamp is set.
        """
        return self.used_at is not None

    @property
    def is_valid(self) -> bool:
        """Check if the token is valid (not expired and not used).

        Returns:
            True if token can be used for password reset.
        """
        return not self.is_expired and not self.is_used

    def mark_as_used(self) -> None:
        """Mark the token as used.

        This should be called after successfully resetting the password.

        Raises:
            ValueError: If token has already been used or has expired.
        """
        if self.is_used:
            raise ValueError("Password reset token has already been used")
        if self.is_expired:
            raise ValueError("Password reset token has expired")

        self.used_at = datetime.utcnow()

    def invalidate(self) -> None:
        """Invalidate the token without marking it as properly used.

        This is used when creating a new token for the same user,
        invalidating any previous active tokens.
        """
        if self.used_at is None:
            self.used_at = datetime.utcnow()

    @property
    def time_until_expiration(self) -> Optional[timedelta]:
        """Get the time remaining until token expiration.

        Returns:
            Timedelta until expiration, or None if already expired.
        """
        if self.is_expired or self.expires_at is None:
            return None
        return self.expires_at - datetime.utcnow()
