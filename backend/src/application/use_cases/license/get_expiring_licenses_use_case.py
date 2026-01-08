"""Get Expiring Licenses use case."""

from typing import List

from src.domain.entities.license import License
from src.application.ports.license_repository import LicenseRepositoryPort


class GetExpiringLicensesUseCase:
    """Use case for getting licenses expiring soon."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, days_threshold: int = 30, limit: int = 100) -> List[License]:
        """Execute the use case."""
        return await self.license_repository.find_expiring_soon(days_threshold, limit)
