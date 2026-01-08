"""Create License use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.license import License, LicenseStatus, LicenseType
from src.domain.exceptions.license import LicenseAlreadyExistsError
from src.application.ports.license_repository import LicenseRepositoryPort


class CreateLicenseUseCase:
    """Use case for creating a new license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(
        self,
        license_number: str,
        member_id: str,
        club_id: str,
        association_id: Optional[str] = None,
        license_type: str = "kyu",
        grade: str,
        issue_date: Optional[datetime] = None,
        expiration_date: Optional[datetime] = None
    ) -> License:
        """Execute the use case."""
        # Check if license with same number exists
        existing = await self.license_repository.find_by_license_number(license_number)
        if existing:
            raise LicenseAlreadyExistsError("License with this number already exists")

        license = License(
            license_number=license_number,
            member_id=member_id,
            club_id=club_id,
            association_id=association_id,
            license_type=LicenseType(license_type),
            grade=grade,
            status=LicenseStatus.ACTIVE,
            issue_date=issue_date,
            expiration_date=expiration_date
        )

        return await self.license_repository.create(license)
