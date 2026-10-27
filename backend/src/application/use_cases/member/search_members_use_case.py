"""Search Members use case."""

from typing import List, Optional

from src.domain.entities.member import Member
from src.application.ports.member_repository import MemberRepositoryPort


class SearchMembersUseCase:
    """Use case for searching members by name."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, name: str, limit: int = 0, club_id: Optional[str] = None) -> List[Member]:
        """Execute the use case."""
        return await self.member_repository.search_by_name(name, limit, club_id=club_id)
