"""Update Seminar use case."""

from src.domain.entities.seminar import Seminar
from src.domain.exceptions.seminar import SeminarNotFoundError
from src.application.ports.seminar_repository import SeminarRepositoryPort


class UpdateSeminarUseCase:
    """Use case for updating a seminar."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, seminar_id: str, **kwargs) -> Seminar:
        """Execute to use case."""
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(seminar, key):
                setattr(seminar, key, value)

        return await self.seminar_repository.update(seminar)
