"""Get All Clubs use case."""
from typing import Optional


from typing import List, Optional

from src.domain.entities.club import Club
from src.application.ports.club_repository import ClubRepositoryPort


class GetAllClubsUseCase:
    """Use case for getting all clubs."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, limit: int = 100, association_id: Optional[str] = None) -> List[Club]:
        """Execute the use case."""
        if association_id:
            return await self.club_repository.find_by_association_id(association_id, limit)
        return await self.club_repository.find_all(limit)
