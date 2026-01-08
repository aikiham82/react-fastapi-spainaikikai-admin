"""Get Club use case."""

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort


class GetClubUseCase:
    """Use case for getting a club by ID."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, club_id: str) -> Club:
        """Execute the use case."""
        club = await self.club_repository.find_by_id(club_id)
        if club is None:
            raise ClubNotFoundError(club_id)
        return club
