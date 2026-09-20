"""Generate a password reset link on behalf of an account."""

import logging
from dataclasses import dataclass
from datetime import datetime

from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.exceptions.user import UserNotFoundError
from src.application.ports.repositories import UserRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort

logger = logging.getLogger(__name__)


@dataclass
class AdminPasswordResetLinkResult:
    """Reset link handed to a super admin for delivery outside the app."""
    url: str
    email: str
    expires_at: datetime


class GenerateAdminPasswordResetLinkUseCase:
    """Use case for issuing a password reset link without sending any email.

    Clubs often cannot receive the self-service email: the address their
    account logs in with is not the one they know. A super admin generates
    the link here and delivers it through another channel.

    Unlike the public flow, this one does not rate limit and does not depend
    on the email service being available. It is already gated by super admin
    privileges at the web layer.
    """

    def __init__(
        self,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
        frontend_base_url: str
    ):
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.frontend_base_url = frontend_base_url.rstrip('/')

    async def execute(self, user_id: str) -> AdminPasswordResetLinkResult:
        """Issue a reset link for the given account.

        Args:
            user_id: The account the link is issued for.

        Returns:
            The link, the account's login email and the link expiration.

        Raises:
            UserNotFoundError: If no account matches the given id.
        """
        user = await self.user_repository.find_by_id(user_id)

        if not user:
            raise UserNotFoundError(user_id)

        await self.token_repository.invalidate_user_tokens(user.id)

        token = PasswordResetToken(user_id=user.id, email=user.email)
        await self.token_repository.create(token)

        logger.info(f"Admin issued a password reset link for user {user.id}")

        return AdminPasswordResetLinkResult(
            url=f"{self.frontend_base_url}/reset-password?token={token.token}",
            email=user.email,
            expires_at=token.expires_at
        )
