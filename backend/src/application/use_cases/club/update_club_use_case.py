"""Update Club use case."""

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.use_cases.apply_changes import apply_changes


class UpdateClubUseCase:
    """Use case for updating a club."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, club_id: str, **kwargs) -> Club:
        """Execute the use case."""
        club = await self.club_repository.find_by_id(club_id)
        if club is None:
            raise ClubNotFoundError(club_id)

        return await self.club_repository.update(apply_changes(club, kwargs))
