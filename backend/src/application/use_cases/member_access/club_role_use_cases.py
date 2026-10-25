"""Change who manages a club and remove a member's web access."""

from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole
from src.domain.exceptions.member import LastClubAdminError, MemberNotFoundError
from src.domain.exceptions.user import AccessChangeNotAllowedError, UserNotFoundError
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort


async def _load_member(member_repository: MemberRepositoryPort, member_id: str) -> Member:
    member = await member_repository.find_by_id(member_id)
    if not member:
        raise MemberNotFoundError(member_id)
    return member


async def _refuse_removing_the_last_admin(member_repository: MemberRepositoryPort, member: Member) -> None:
    if not member.is_club_admin:
        return
    club = await member_repository.find_by_club_id(member.club_id)
    other_admins = [m for m in club if m.is_club_admin and m.id != member.id]
    if not other_admins:
        raise LastClubAdminError("The club needs at least one admin")


class SetMemberClubRoleUseCase:
    """Make a member a club admin, or take the role away while another admin remains."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, member_id: str, club_role: ClubRole) -> Member:
        member = await _load_member(self.member_repository, member_id)

        if club_role == ClubRole.ADMIN:
            member.promote_to_admin()
        else:
            await _refuse_removing_the_last_admin(self.member_repository, member)
            member.demote_to_member()

        return await self.member_repository.update(member)


class RevokeMemberAccessUseCase:
    """Switch off a member's account so they can no longer sign in.

    The account is kept, not deleted, so giving access again reuses it.
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

    async def execute(self, member_id: str, revoked_by_member_id: str | None) -> None:
        member = await _load_member(self.member_repository, member_id)

        user = await self.user_repository.find_by_member_id(member_id)
        if not user:
            raise UserNotFoundError(f"member:{member_id}")
        if user.global_role == GlobalRole.SUPER_ADMIN:
            raise AccessChangeNotAllowedError("The super admin account cannot be switched off here")
        if member_id == revoked_by_member_id:
            raise AccessChangeNotAllowedError("You cannot remove your own access")

        await _refuse_removing_the_last_admin(self.member_repository, member)

        await self.token_repository.invalidate_user_tokens(user.id)
        user.deactivate()
        await self.user_repository.update(user)

        if member.is_club_admin:
            member.demote_to_member()
            await self.member_repository.update(member)
