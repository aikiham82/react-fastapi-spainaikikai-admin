"""Create License use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.license import (
    AgeCategory,
    InstructorCategory,
    License,
    LicenseStatus,
    LicenseType,
    TechnicalGrade,
)
from src.domain.exceptions.license import LicenseAlreadyExistsError
from src.application.ports.license_repository import LicenseRepositoryPort


def _grade_of_license_type(license_type: str) -> TechnicalGrade:
    return TechnicalGrade.DAN if license_type == LicenseType.DAN.value else TechnicalGrade.KYU


class CreateLicenseUseCase:
    """Use case for creating a new license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(
        self,
        license_number: str,
        member_id: str,
        grade: str,
        association_id: Optional[str] = None,
        license_type: Optional[str] = None,
        issue_date: Optional[datetime] = None,
        expiration_date: Optional[datetime] = None,
        technical_grade: Optional[str] = None,
        instructor_category: Optional[str] = None,
        age_category: Optional[str] = None,
    ) -> License:
        """Execute the use case."""
        # Check if license with same number exists
        existing = await self.license_repository.find_by_license_number(license_number)
        if existing:
            raise LicenseAlreadyExistsError("License with this number already exists")

        # Licenses are annual: expire on Dec 31 of the issue year
        if not expiration_date and issue_date:
            expiration_date = datetime(issue_date.year, 12, 31, 23, 59, 59)

        license = License(
            license_number=license_number,
            member_id=member_id,
            association_id=association_id,
            license_type=LicenseType(license_type or technical_grade or LicenseType.KYU),
            grade=grade,
            status=LicenseStatus.ACTIVE,
            issue_date=issue_date,
            expiration_date=expiration_date,
            technical_grade=TechnicalGrade(technical_grade or _grade_of_license_type(license_type)),
            instructor_category=InstructorCategory(instructor_category or InstructorCategory.NONE),
            age_category=AgeCategory(age_category or AgeCategory.ADULTO),
        )

        return await self.license_repository.create(license)
