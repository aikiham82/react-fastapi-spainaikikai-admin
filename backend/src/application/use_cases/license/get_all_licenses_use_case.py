"""Get All Licenses use case."""

from typing import List, Optional

from src.domain.entities.license import License
from src.application.ports.license_repository import LicenseRepositoryPort


class GetAllLicensesUseCase:
    """Use case for getting all licenses."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(
        self,
        limit: int = 100,
        club_id: Optional[str] = None,
        member_id: Optional[str] = None
    ) -> List[License]:
        """Execute the use case."""
        if member_id:
            return await self.license_repository.find_by_member_id(member_id, limit)
        if club_id:
            return await self.license_repository.find_by_club_id(club_id, limit)
        return await self.license_repository.find_all(limit)
