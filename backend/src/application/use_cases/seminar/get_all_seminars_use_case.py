"""Get All Seminars use case."""

from typing import List, Optional

from src.domain.entities.seminar import Seminar
from src.application.ports.seminar_repository import SeminarRepositoryPort


class GetAllSeminarsUseCase:
    """Use case for getting all seminars."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(
        self,
        limit: int = 100,
        club_id: Optional[str] = None,
        association_id: Optional[str] = None
    ) -> List[Seminar]:
        """Execute to use case."""
        if club_id:
            return await self.seminar_repository.find_by_club_id(club_id, limit)
        if association_id:
            return await self.seminar_repository.find_by_association_id(association_id, limit)
        return await self.seminar_repository.find_all(limit)
