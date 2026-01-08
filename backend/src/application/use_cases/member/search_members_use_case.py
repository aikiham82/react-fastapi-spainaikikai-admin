"""Search Members use case."""

from typing import List

from src.domain.entities.member import Member
from src.application.ports.member_repository import MemberRepositoryPort


class SearchMembersUseCase:
    """Use case for searching members by name."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, name: str, limit: int = 100) -> List[Member]:
        """Execute the use case."""
        return await self.member_repository.search_by_name(name, limit)
