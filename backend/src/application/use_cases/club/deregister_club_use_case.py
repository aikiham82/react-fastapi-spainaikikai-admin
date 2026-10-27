"""Deregister a club that has left the federation."""

from dataclasses import dataclass

from src.domain.entities.user import GlobalRole
from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort
from src.application.use_cases.member_access.switch_off_login import switch_off_login


@dataclass(frozen=True)
class DeregisteredClub:
    members: int
    accounts: int


class DeregisterClubUseCase:
    """Switch off the club, every member with its club_id and every login of those members.

    Works on the club_id, so members whose club record is missing are deregistered too.
    """

    def __init__(
        self,
        club_repository: ClubRepositoryPort,
        member_repository: MemberRepositoryPort,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort,
    ):
        self.club_repository = club_repository
        self.member_repository = member_repository
        self.user_repository = user_repository
        self.token_repository = token_repository

    async def execute(self, club_id: str) -> DeregisteredClub:
        club = await self.club_repository.find_by_id(club_id)
        members = await self.member_repository.find_by_club_id(club_id)
        if not club and not members:
            raise ClubNotFoundError(club_id)

        accounts = 0
        switched_off = 0
        for member in members:
            account = await self.user_repository.find_by_member_id(member.id)
            if account and account.is_active and account.global_role != GlobalRole.SUPER_ADMIN:
                await switch_off_login(account, self.user_repository, self.token_repository)
                accounts += 1
            if member.is_active:
                member.deactivate()
                await self.member_repository.update(member)
                switched_off += 1

        if club:
            club.deactivate()
            await self.club_repository.update(club)
        return DeregisteredClub(members=switched_off, accounts=accounts)
