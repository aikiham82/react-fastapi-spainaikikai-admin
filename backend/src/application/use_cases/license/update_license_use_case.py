"""Update License use case."""

from src.domain.entities.license import License
from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort


class UpdateLicenseUseCase:
    """Use case for updating a license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, license_id: str, **kwargs) -> License:
        """Execute the use case."""
        license = await self.license_repository.find_by_id(license_id)
        if license is None:
            raise LicenseNotFoundError(license_id)

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(license, key):
                if key == "grade":
                    license.update_grade(value)
                else:
                    setattr(license, key, value)

        return await self.license_repository.update(license)
