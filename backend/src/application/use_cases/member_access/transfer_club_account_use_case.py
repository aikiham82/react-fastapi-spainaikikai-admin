"""Pass a club's shared login onto the person who runs the club."""

from typing import Optional, Tuple

from src.domain.entities.member import Member
from src.domain.entities.user import User
from src.domain.exceptions.member import InactiveMemberError, InvalidClubForMemberError, MemberNotFoundError
from src.domain.exceptions.user import ClubAccountNotFoundError, UserAlreadyExistsError
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort


class TransferClubAccountUseCase:
    """Relink the club's account to a member of that club, who becomes club admin.

    The account keeps its email, username and password, so whoever signed in
    with it keeps signing in the same way. The placeholder member it hung from
    is left inactive. The caller names the account it saw, so a member renamed
    to look like a placeholder cannot make another login move instead; reset
    links sent to the club inbox stop working.
    """

    def __init__(
        self,
        member_repository: MemberRepositoryPort,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
    ):
        self.member_repository = member_repository
        self.user_repository = user_repository
        self.token_repository = token_repository

    async def execute(self, club_id: str, account_id: str, member_id: str) -> User:
        member = await self.member_repository.find_by_id(member_id)
        if not member:
            raise MemberNotFoundError(member_id)
        if member.club_id != club_id:
            raise InvalidClubForMemberError("The member does not belong to this club")
        if not member.is_active:
            raise InactiveMemberError("The member is not active")
        if await self.user_repository.find_by_member_id(member_id):
            raise UserAlreadyExistsError("This member already has an account")

        placeholder, account = await self._club_account(club_id, account_id)

        member.promote_to_admin()
        await self.member_repository.update(member)
        await self.token_repository.invalidate_user_tokens(account.id)
        account.link_to_member(member_id)
        user = await self.user_repository.update(account)
        placeholder.deactivate()
        await self.member_repository.update(placeholder)
        return user

    async def _club_account(self, club_id: str, account_id: str) -> Tuple[Member, User]:
        account = await self.user_repository.find_by_id(account_id)
        placeholder = await self.member_repository.find_by_id(account.member_id) if account and account.member_id else None
        if not (account and account.is_active and placeholder and placeholder.is_club_account_placeholder and placeholder.club_id == club_id):
            raise ClubAccountNotFoundError(club_id)
        return placeholder, account


async def active_club_account(member: Member, user_repository: UserRepositoryPort) -> Optional[User]:
    """The shared login hanging from a migration placeholder, if it still signs in."""
    if not member.is_club_account_placeholder:
        return None
    account = await user_repository.find_by_member_id(member.id)
    return account if account and account.is_active else None
