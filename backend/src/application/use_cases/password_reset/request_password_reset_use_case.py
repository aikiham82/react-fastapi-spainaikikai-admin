"""Request password reset use case."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from src.domain.entities.password_reset_token import PasswordResetToken
from src.application.ports.repositories import UserRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.email_service import EmailServicePort


@dataclass
class RequestPasswordResetResult:
    """Result of password reset request.

    Always returns success=True to prevent email enumeration attacks.
    The message is generic regardless of whether the email exists.
    """
    success: bool = True
    message: str = "Si existe una cuenta con ese correo, recibiras un enlace para restablecer tu contrasena."


class RequestPasswordResetUseCase:
    """Use case for requesting a password reset.

    Security considerations:
    - Always returns the same response regardless of whether email exists
    - Invalidates any existing tokens before creating a new one
    - Rate limiting can be implemented at the router level
    """

    # Maximum reset requests allowed per email per 24 hours
    MAX_REQUESTS_PER_DAY = 5

    def __init__(
        self,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
        email_service: EmailServicePort,
        frontend_base_url: str
    ):
        """Initialize the use case.

        Args:
            user_repository: Repository for user operations.
            token_repository: Repository for token operations.
            email_service: Service for sending emails.
            frontend_base_url: Base URL for the frontend app (for reset links).
        """
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.email_service = email_service
        self.frontend_base_url = frontend_base_url.rstrip('/')

    async def execute(self, email: str) -> RequestPasswordResetResult:
        """Execute the password reset request.

        Args:
            email: The email address requesting password reset.

        Returns:
            RequestPasswordResetResult: Always returns success to prevent enumeration.
        """
        # Normalize email
        email = email.lower().strip()

        # Find user by email - but don't reveal if it exists
        user = await self.user_repository.find_by_email(email)

        # Only proceed if user exists and is active
        if user and user.is_active:
            # Check rate limiting
            since = datetime.utcnow() - timedelta(hours=24)
            recent_requests = await self.token_repository.count_recent_requests(email, since)

            if recent_requests < self.MAX_REQUESTS_PER_DAY:
                # Invalidate any existing active tokens for this user
                await self.token_repository.invalidate_user_tokens(user.id)

                # Create new token
                token = PasswordResetToken(
                    user_id=user.id,
                    email=email
                )
                await self.token_repository.create(token)

                # Build reset URL
                reset_url = f"{self.frontend_base_url}/reset-password?token={token.token}"

                # Send email (don't let email failures affect the response)
                try:
                    await self.email_service.send_password_reset_email(
                        to_email=email,
                        user_name=user.username,
                        reset_url=reset_url
                    )
                except Exception:
                    # Log error but don't expose to user
                    pass

        # Always return the same result to prevent email enumeration
        return RequestPasswordResetResult()
