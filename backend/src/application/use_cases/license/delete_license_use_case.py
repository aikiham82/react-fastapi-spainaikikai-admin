"""Delete License use case."""

from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort


class DeleteLicenseUseCase:
    """Use case for deleting a license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, license_id: str) -> bool:
        """Execute the use case."""
        if not await self.license_repository.exists(license_id):
            raise LicenseNotFoundError(license_id)

        return await self.license_repository.delete(license_id)
