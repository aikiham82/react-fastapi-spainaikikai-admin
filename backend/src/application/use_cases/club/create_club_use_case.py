"""Create Club use case."""

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubAlreadyExistsError
from src.application.ports.club_repository import ClubRepositoryPort


class CreateClubUseCase:
    """Use case for creating a new club."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, name: str, address: str, city: str, province: str,
                     postal_code: str, country: str, phone: str, email: str) -> Club:
        """Execute the use case."""
        club = Club(
            name=name,
            address=address,
            city=city,
            province=province,
            postal_code=postal_code,
            country=country,
            phone=phone,
            email=email
        )

        return await self.club_repository.create(club)
