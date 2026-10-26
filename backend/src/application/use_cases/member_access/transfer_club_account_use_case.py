"""Pass a club's shared login onto the person who runs the club."""

from typing import Optional, Tuple

from src.domain.entities.member import Member
from src.domain.entities.user import User
from src.domain.exceptions.member import InactiveMemberError, InvalidClubForMemberError, MemberNotFoundError
from src.domain.exceptions.user import ClubAccountNotFoundError, UserAlreadyExistsError
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.repositories import UserRepositoryPort


class TransferClubAccountUseCase:
    """Relink the club's account to a member of that club, who becomes club admin.

    The account keeps its email, username and password, so whoever signed in
    with it keeps signing in the same way. The placeholder member it hung from
    is left inactive.
    """

    def __init__(self, member_repository: MemberRepositoryPort, user_repository: UserRepositoryPort):
        self.member_repository = member_repository
        self.user_repository = user_repository

    async def execute(self, club_id: str, member_id: str) -> User:
        member = await self.member_repository.find_by_id(member_id)
        if not member:
            raise MemberNotFoundError(member_id)
        if member.club_id != club_id:
            raise InvalidClubForMemberError("The member does not belong to this club")
        if not member.is_active:
            raise InactiveMemberError("The member is not active")
        if await self.user_repository.find_by_member_id(member_id):
            raise UserAlreadyExistsError("This member already has an account")

        found = await self._club_account(club_id)
        if not found:
            raise ClubAccountNotFoundError(club_id)
        placeholder, account = found

        member.promote_to_admin()
        await self.member_repository.update(member)
        account.link_to_member(member_id)
        user = await self.user_repository.update(account)
        placeholder.deactivate()
        await self.member_repository.update(placeholder)
        return user

    async def _club_account(self, club_id: str) -> Optional[Tuple[Member, User]]:
        for candidate in await self.member_repository.find_by_club_id(club_id):
            if not candidate.is_club_account_placeholder:
                continue
            account = await self.user_repository.find_by_member_id(candidate.id)
            if account and account.is_active:
                return candidate, account
        return None
