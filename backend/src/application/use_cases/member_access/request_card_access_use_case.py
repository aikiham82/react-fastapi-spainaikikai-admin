"""Let a member activate their card in the app by themselves."""

import logging
import secrets
from typing import Callable

from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.entities.user import User
from src.application.ports.email_service import EmailServicePort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort

logger = logging.getLogger(__name__)


class RequestCardAccessUseCase:
    """Create the card account of the one member whose file holds this email, and mail the set-password link.

    Nothing happens, silently, unless the email belongs to exactly one active
    member who has no account and no login already uses it: the caller is
    anonymous, so the answer must not tell which case it was. The account
    does not manage the club.
    """

    def __init__(
        self,
        member_repository: MemberRepositoryPort,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
        email_service: EmailServicePort,
        hash_password: Callable[[str], str],
        frontend_base_url: str,
    ):
        self.member_repository = member_repository
        self.user_repository = user_repository
        self.token_repository = token_repository
        self.email_service = email_service
        self.hash_password = hash_password
        self.frontend_base_url = frontend_base_url.rstrip('/')

    async def execute(self, email: str) -> None:
        email = (email or "").strip().lower()
        if "@" not in email:
            return

        holders = [m for m in await self.member_repository.find_all_by_email(email) if not m.is_club_account_placeholder]
        if len(holders) != 1 or not holders[0].is_active:
            logger.info("Card access not granted: the email matches %d members", len(holders))
            return
        member = holders[0]
        if (
            await self.user_repository.find_by_email(email)
            or await self.user_repository.find_by_username_loose(email)
            or await self.user_repository.find_by_member_id(member.id)
        ):
            logger.info(f"Card access not granted: member {member.id} or the email already has an account")
            return

        user = await self.user_repository.create(User(
            email=email,
            username=email,
            hashed_password=self.hash_password(secrets.token_urlsafe(32)),
            member_id=member.id,
        ))
        token = await self.token_repository.create(PasswordResetToken(user_id=user.id, email=user.email))
        url = f"{self.frontend_base_url}/reset-password?token={token.token}"

        try:
            await self.email_service.send_card_activation_email(
                to_email=user.email, member_name=member.get_full_name(), url=url
            )
        except Exception:
            logger.exception(f"Could not mail the card activation link for member {member.id}")
