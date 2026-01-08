"""Get All Members use case."""
from typing import Optional


from typing import List, Optional

from src.domain.entities.member import Member
from src.application.ports.member_repository import MemberRepositoryPort


class GetAllMembersUseCase:
    """Use case for getting all members."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, limit: int = 100, club_id: Optional[str] = None) -> List[Member]:
        """Execute the use case."""
        if club_id:
            return await self.member_repository.find_by_club_id(club_id, limit)
        return await self.member_repository.find_all(limit)
