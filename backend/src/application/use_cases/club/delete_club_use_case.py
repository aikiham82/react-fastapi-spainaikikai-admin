"""Delete Club use case."""

from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort


class DeleteClubUseCase:
    """Use case for deleting a club."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, club_id: str) -> bool:
        """Execute the use case."""
        if not await self.club_repository.exists(club_id):
            raise ClubNotFoundError(club_id)

        return await self.club_repository.delete(club_id)
