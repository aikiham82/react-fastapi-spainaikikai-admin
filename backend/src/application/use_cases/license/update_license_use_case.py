"""Update License use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.license import (
    AgeCategory,
    InstructorCategory,
    License,
    TechnicalGrade,
)
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort


class UpdateLicenseUseCase:
    """Use case for updating a license."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(
        self,
        license_id: str,
        grade: Optional[str] = None,
        issue_date: Optional[datetime] = None,
        expiration_date: Optional[datetime] = None,
        technical_grade: Optional[str] = None,
        instructor_category: Optional[str] = None,
        age_category: Optional[str] = None,
        annulled: Optional[bool] = None,
        is_renewed: Optional[bool] = None,
    ) -> License:
        """Execute the use case."""
        license = await self.license_repository.find_by_id(license_id)
        if license is None:
            raise LicenseNotFoundError(license_id)

        try:
            if grade is not None:
                license.update_grade(grade)
            license.update_dates(issue_date, expiration_date)
        except ValueError as error:
            raise ValidationError(str(error)) from error
        if technical_grade is not None:
            license.technical_grade = TechnicalGrade(technical_grade)
        if instructor_category is not None:
            license.instructor_category = InstructorCategory(instructor_category)
        if age_category is not None:
            license.age_category = AgeCategory(age_category)
        if is_renewed is not None:
            license.is_renewed = is_renewed

        if annulled:
            license.annul()
        elif annulled is False:
            license.follow_dates()

        return await self.license_repository.update(license)
