"""Request password reset use case."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.entities.user import User
from src.application.use_cases.user_use_cases import FindLoginAccountsUseCase
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.email_service import EmailServicePort

logger = logging.getLogger(__name__)


@dataclass
class RequestPasswordResetResult:
    """Result of password reset request."""
    success: bool = True
    message: str = "Si existe una cuenta, recibiras un enlace en el correo con el que entras."


class RequestPasswordResetUseCase:
    """Use case for requesting a password reset.

    The identifier is either the email or the user name the account signs in
    with, because the address the migration stored is often one nobody
    remembers while the club name is known. User names are not unique, so
    every matching account receives a link at its own address.

    Security considerations:
    - Always returns the same response regardless of what was typed
    - Invalidates any existing tokens before creating a new one
    - Email service availability is checked BEFORE the lookup to prevent enumeration
    """

    MAX_REQUESTS_PER_DAY = 5

    def __init__(
        self,
        find_login_accounts_use_case: FindLoginAccountsUseCase,
        token_repository: PasswordResetTokenRepositoryPort,
        email_service: EmailServicePort,
        frontend_base_url: str
    ):
        self.find_login_accounts_use_case = find_login_accounts_use_case
        self.token_repository = token_repository
        self.email_service = email_service
        self.frontend_base_url = frontend_base_url.rstrip('/')

    async def execute(self, identifier: str) -> RequestPasswordResetResult:
        """Execute the password reset request."""
        # Check email service BEFORE the lookup to prevent enumeration
        if not self.email_service.is_available():
            logger.error("Email service is not configured")
            return RequestPasswordResetResult(
                success=False,
                message="El servicio de correo no esta disponible. Intentalo mas tarde."
            )

        accounts = await self.find_login_accounts_use_case.execute(identifier)

        for account in accounts:
            if not account.is_active:
                continue

            sent = await self._send_link_to(account)
            if not sent:
                # Reporting the failure would tell the caller the account
                # exists, and would deny the remaining accounts their link.
                logger.error(f"Could not deliver a password reset link for user {account.id}")

        # Whatever happened, the answer is the same (anti-enumeration)
        return RequestPasswordResetResult()

    async def _send_link_to(self, account: User) -> bool:
        """Issue a link for one account and mail it to that account's address."""
        email = account.email.lower().strip()

        since = datetime.utcnow() - timedelta(hours=24)
        recent_requests = await self.token_repository.count_recent_requests(email, since)

        if recent_requests >= self.MAX_REQUESTS_PER_DAY:
            return True

        await self.token_repository.invalidate_user_tokens(account.id)

        token = PasswordResetToken(user_id=account.id, email=email)
        await self.token_repository.create(token)

        reset_url = f"{self.frontend_base_url}/reset-password?token={token.token}"

        try:
            email_sent = await self.email_service.send_password_reset_email(
                to_email=email,
                user_name=account.username,
                reset_url=reset_url
            )
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return False

        if not email_sent:
            logger.error(f"Failed to send password reset email for user {account.id}")
            return False

        return True
