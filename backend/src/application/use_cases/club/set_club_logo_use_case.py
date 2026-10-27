"""Use case for setting a club logo."""

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort


class SetClubLogoUseCase:
    """Sets logo_url on a club after the image has been saved to disk."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, club_id: str, logo_url: str) -> Club:
        club = await self.club_repository.find_by_id(club_id)
        if club is None:
            raise ClubNotFoundError(club_id)
        club.logo_url = logo_url
        return await self.club_repository.update(club)
