"""Update Club use case."""

from typing import Optional

from src.domain.entities.club import Club
from src.domain.exceptions.club import ClubNotFoundError
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.use_cases.apply_changes import apply_changes


class UpdateClubUseCase:
    """Use case for updating a club."""

    def __init__(self, club_repository: ClubRepositoryPort):
        self.club_repository = club_repository

    async def execute(
        self,
        club_id: str,
        name: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        postal_code: Optional[str] = None,
        country: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        website: Optional[str] = None,
    ) -> Club:
        """Execute the use case."""
        club = await self.club_repository.find_by_id(club_id)
        if club is None:
            raise ClubNotFoundError(club_id)

        return await self.club_repository.update(
            apply_changes(
                club,
                name=name,
                address=address,
                city=city,
                province=province,
                postal_code=postal_code,
                country=country,
                phone=phone,
                email=email,
                website=website,
            )
        )
