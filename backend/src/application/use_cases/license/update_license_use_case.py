"""Update License use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.license import (
    AgeCategory,
    InstructorCategory,
    License,
    LicenseStatus,
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

        if grade is not None:
            try:
                license.update_grade(grade)
            except ValueError as error:
                raise ValidationError(str(error)) from error
        if issue_date is not None:
            license.issue_date = issue_date
        if expiration_date is not None:
            license.expiration_date = expiration_date
        if technical_grade is not None:
            license.technical_grade = TechnicalGrade(technical_grade)
        if instructor_category is not None:
            license.instructor_category = InstructorCategory(instructor_category)
        if age_category is not None:
            license.age_category = AgeCategory(age_category)
        if is_renewed is not None:
            license.is_renewed = is_renewed
        if license.issue_date and license.expiration_date and license.issue_date > license.expiration_date:
            raise ValidationError("La fecha de emisión debe ser anterior a la de vencimiento")

        if annulled:
            license.annul()
        elif annulled is False or (expiration_date is not None and license.status != LicenseStatus.REVOKED):
            license.follow_dates()

        return await self.license_repository.update(license)
