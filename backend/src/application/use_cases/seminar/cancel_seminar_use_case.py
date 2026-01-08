"""Cancel Seminar use case."""

from src.domain.entities.seminar import Seminar
from src.domain.exceptions.seminar import SeminarNotFoundError
from src.application.ports.seminar_repository import SeminarRepositoryPort


class CancelSeminarUseCase:
    """Use case for cancelling a seminar."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, seminar_id: str) -> Seminar:
        """Execute to use case."""
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)

        seminar.cancel()

        return await self.seminar_repository.update(seminar)
