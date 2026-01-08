"""Get Upcoming Seminars use case."""

from typing import List

from src.domain.entities.seminar import Seminar
from src.application.ports.seminar_repository import SeminarRepositoryPort


class GetUpcomingSeminarsUseCase:
    """Use case for getting upcoming seminars."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, limit: int = 100) -> List[Seminar]:
        """Execute to use case."""
        return await self.seminar_repository.find_upcoming(limit)
