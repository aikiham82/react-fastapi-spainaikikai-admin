"""Get License use case."""

from src.domain.entities.license import License
from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort


class GetLicenseUseCase:
    """Use case for getting a license by ID."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, license_id: str) -> License:
        """Execute the use case."""
        license = await self.license_repository.find_by_id(license_id)
        if license is None:
            raise LicenseNotFoundError(license_id)
        return license
