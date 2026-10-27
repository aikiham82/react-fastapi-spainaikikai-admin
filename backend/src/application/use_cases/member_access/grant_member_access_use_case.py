"""Give a member their own login to the admin web."""

import logging
import secrets
from typing import Callable

from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.member import InactiveMemberError, MemberNotFoundError
from src.domain.exceptions.user import AccessChangeNotAllowedError, EmailAlreadyInUseError, UserAlreadyExistsError
from src.application.ports.email_service import EmailServicePort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort
from src.application.use_cases.password_reset import AdminPasswordResetLinkResult
from src.application.use_cases.member_access.set_password_link import issue_set_password_link

logger = logging.getLogger(__name__)


class GrantMemberAccessUseCase:
    """Create the account a member signs in with and hand them a link to set its password.

    The account starts with a random password nobody knows, so the only way
    in is the link. The link is returned as well as mailed: the club can send
    it another way when the address bounces.
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

    async def execute(
        self, member_id: str, email: str, make_club_admin: bool, issued_by: str = ""
    ) -> AdminPasswordResetLinkResult:
        member = await self.member_repository.find_by_id(member_id)
        if not member:
            raise MemberNotFoundError(member_id)
        if not member.is_active:
            raise InactiveMemberError("The member is de baja")

        linked = await self.user_repository.find_by_member_id(member_id)
        if linked and linked.is_active:
            raise UserAlreadyExistsError("This member already has an account")
        if linked and linked.global_role == GlobalRole.SUPER_ADMIN:
            raise AccessChangeNotAllowedError("The super admin account cannot be reactivated here")

        email = email.lower().strip()
        holder = await self.user_repository.find_by_email(email)
        if holder and (not linked or holder.id != linked.id):
            raise EmailAlreadyInUseError(email)

        if linked:
            linked.update_email(email)
            linked.update_password(self.hash_password(secrets.token_urlsafe(32)))
            linked.activate()
            user = await self.user_repository.update(linked)
        else:
            user = await self.user_repository.create(User(
                email=email,
                username=email,
                hashed_password=self.hash_password(secrets.token_urlsafe(32)),
                member_id=member_id,
            ))

        if make_club_admin:
            member.promote_to_admin()
        if not (member.email or "").strip():
            member.email = email
        if make_club_admin or member.email == email:
            await self.member_repository.update(member)

        token, url = await issue_set_password_link(user, self.token_repository, self.frontend_base_url)
        logger.info(f"User {issued_by or 'unknown'} gave web access to member {member_id}")
        member_name = member.get_full_name()

        try:
            await self.email_service.send_account_invitation_email(
                to_email=user.email, member_name=member_name, url=url
            )
        except Exception:
            logger.exception(f"Could not mail the access link for member {member_id}")

        return AdminPasswordResetLinkResult(url=url, email=user.email, expires_at=token.expires_at)
