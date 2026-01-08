"""Delete Seminar use case."""

from src.domain.exceptions.seminar import SeminarNotFoundError
from src.application.ports.seminar_repository import SeminarRepositoryPort


class DeleteSeminarUseCase:
    """Use case for deleting a seminar."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, seminar_id: str) -> bool:
        """Execute to use case."""
        if not await self.seminar_repository.exists(seminar_id):
            raise SeminarNotFoundError(seminar_id)

        return await self.seminar_repository.delete(seminar_id)
