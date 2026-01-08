"""Create Club use case."""

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubAlreadyExistsError
from src.application.ports.club_repository import ClubRepositoryPort


class CreateClubUseCase:
    """Use case for creating a new club."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(self, name: str, address: str, city: str, province: str,
                     postal_code: str, country: str, phone: str, email: str,
                     federation_number: str, association_id: Optional[str] = None) -> Club:
        """Execute the use case."""
        # Check if club with same federation number exists
        existing = await self.club_repository.find_by_federation_number(federation_number)
        if existing:
            raise ClubAlreadyExistsError("Club with this federation number already exists")

        club = Club(
            name=name,
            address=address,
            city=city,
            province=province,
            postal_code=postal_code,
            country=country,
            phone=phone,
            email=email,
            federation_number=federation_number,
            association_id=association_id
        )

        return await self.club_repository.create(club)
