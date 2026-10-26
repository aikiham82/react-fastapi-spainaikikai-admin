"""List the clubs still signing in with a shared club account."""

import asyncio
from dataclasses import dataclass, field
from typing import List

from src.domain.entities.license import InstructorCategory, License, LicenseStatus
from src.domain.entities.member import Member
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.repositories import UserRepositoryPort
from src.application.use_cases.member_access.transfer_club_account_use_case import active_club_account

CANDIDATE_TITLES = (InstructorCategory.SHIDOIN, InstructorCategory.FUKUSHIDOIN)


@dataclass(frozen=True)
class ClubAccountCandidate:
    member_id: str
    name: str
    instructor_category: str


@dataclass(frozen=True)
class ClubAccountSummary:
    club_id: str
    club_name: str
    username: str
    email: str
    candidates: List[ClubAccountCandidate] = field(default_factory=list)


class ListClubAccountsUseCase:
    """Each club account with the people it could be passed to.

    The candidates are the club's shidoin, or its fukushidoin when it has no
    shidoin: whoever holds the title on any licence not annulled, since the
    title outlives an unpaid year. Members who already have an account are
    left out, as the account cannot be passed to them; when every shidoin
    already has one, the fukushidoin are offered.
    """

    def __init__(
        self,
        member_repository: MemberRepositoryPort,
        user_repository: UserRepositoryPort,
        club_repository: ClubRepositoryPort,
        license_repository: LicenseRepositoryPort,
    ):
        self.member_repository = member_repository
        self.user_repository = user_repository
        self.club_repository = club_repository
        self.license_repository = license_repository

    async def execute(self) -> List[ClubAccountSummary]:
        # ponytail: scans every member for the ~40 placeholders; a last_name query on the port if members grow past tens of thousands.
        placeholders = [m for m in await self.member_repository.find_all() if m.is_club_account_placeholder]
        summaries = []
        for placeholder in placeholders:
            account = await active_club_account(placeholder, self.user_repository)
            if not account:
                continue
            club = await self.club_repository.find_by_id(placeholder.club_id)
            summaries.append(ClubAccountSummary(
                club_id=placeholder.club_id,
                club_name=club.name if club else placeholder.first_name,
                username=account.username,
                email=account.email,
                candidates=await self._candidates(placeholder.club_id),
            ))
        return sorted(summaries, key=lambda s: s.club_name.lower())

    async def _candidates(self, club_id: str) -> List[ClubAccountCandidate]:
        people = {
            m.id: m for m in await self.member_repository.find_by_club_id(club_id)
            if m.is_active and not m.is_club_account_placeholder
        }
        if not people:
            return []
        licences = await self.license_repository.find_by_member_ids(list(people))
        for title in CANDIDATE_TITLES:
            holders = [people[member_id] for member_id in _holders_of(licences, title)]
            accounts = await asyncio.gather(*(self.user_repository.find_by_member_id(m.id) for m in holders))
            free = [m for m, account in zip(holders, accounts) if not account]
            if free:
                return [ClubAccountCandidate(m.id, m.get_full_name(), title.value) for m in sorted(free, key=Member.get_full_name)]
        return []


def _holders_of(licences: List[License], title: InstructorCategory) -> List[str]:
    return list(dict.fromkeys(
        l.member_id for l in licences if l.instructor_category == title and l.status != LicenseStatus.REVOKED
    ))
