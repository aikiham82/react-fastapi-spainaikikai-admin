"""Renew License use case."""

from datetime import datetime

from src.domain.entities.license import License
from src.domain.exceptions.license import LicenseNotFoundError, ExpiredLicenseError, InvalidLicenseRenewalError
from src.application.ports.license_repository import LicenseRepositoryPort


class RenewLicenseUseCase:
    """Use case for renewing a license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, license_id: str, expiration_date: datetime) -> License:
        """Execute the use case."""
        license = await self.license_repository.find_by_id(license_id)
        if license is None:
            raise LicenseNotFoundError(license_id)

        # Check if license is expired
        if license.is_expired():
            raise ExpiredLicenseError("Cannot renew an expired license")

        # Validate expiration date
        if expiration_date <= datetime.utcnow():
            raise InvalidLicenseRenewalError("Expiration date must be in the future")

        # Renew the license
        license.renew(expiration_date)

        return await self.license_repository.update(license)
