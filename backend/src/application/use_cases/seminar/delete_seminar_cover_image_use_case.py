"""Use case for deleting a seminar cover image."""

from src.domain.entities.seminar import Seminar
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.domain.exceptions.seminar import SeminarNotFoundError


class DeleteSeminarCoverImageUseCase:
    """Clears cover_image_url on a seminar after the image has been removed from disk."""

    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, seminar_id: str) -> Seminar:
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)
        seminar.cover_image_url = None
        return await self.seminar_repository.update(seminar)
