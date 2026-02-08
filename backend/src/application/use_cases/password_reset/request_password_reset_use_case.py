"""Request password reset use case."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from src.domain.entities.password_reset_token import PasswordResetToken
from src.application.ports.repositories import UserRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.email_service import EmailServicePort

logger = logging.getLogger(__name__)


@dataclass
class RequestPasswordResetResult:
    """Result of password reset request."""
    success: bool = True
    message: str = "Si existe una cuenta con ese correo, recibiras un enlace para restablecer tu contrasena."


class RequestPasswordResetUseCase:
    """Use case for requesting a password reset.

    Security considerations:
    - Always returns the same response regardless of whether email exists
    - Invalidates any existing tokens before creating a new one
    - Email service availability is checked BEFORE user lookup to prevent enumeration
    """

    MAX_REQUESTS_PER_DAY = 5

    def __init__(
        self,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
        email_service: EmailServicePort,
        frontend_base_url: str
    ):
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.email_service = email_service
        self.frontend_base_url = frontend_base_url.rstrip('/')

    async def execute(self, email: str) -> RequestPasswordResetResult:
        """Execute the password reset request."""
        # Check email service BEFORE user lookup to prevent enumeration
        if not self.email_service.is_available():
            logger.error("Email service is not configured")
            return RequestPasswordResetResult(
                success=False,
                message="El servicio de correo no esta disponible. Intentalo mas tarde."
            )

        email = email.lower().strip()

        user = await self.user_repository.find_by_email(email)

        if user and user.is_active:
            since = datetime.utcnow() - timedelta(hours=24)
            recent_requests = await self.token_repository.count_recent_requests(email, since)

            if recent_requests < self.MAX_REQUESTS_PER_DAY:
                await self.token_repository.invalidate_user_tokens(user.id)

                token = PasswordResetToken(
                    user_id=user.id,
                    email=email
                )
                await self.token_repository.create(token)

                reset_url = f"{self.frontend_base_url}/reset-password?token={token.token}"

                try:
                    email_sent = await self.email_service.send_password_reset_email(
                        to_email=email,
                        user_name=user.username,
                        reset_url=reset_url
                    )
                    if not email_sent:
                        logger.error(f"Failed to send password reset email to {email}")
                        return RequestPasswordResetResult(
                            success=False,
                            message="No se pudo enviar el correo. Intentalo mas tarde."
                        )
                except Exception as e:
                    logger.error(f"Error sending password reset email: {e}")
                    return RequestPasswordResetResult(
                        success=False,
                        message="No se pudo enviar el correo. Intentalo mas tarde."
                    )

        # User not found or inactive → generic success (anti-enumeration)
        return RequestPasswordResetResult()
