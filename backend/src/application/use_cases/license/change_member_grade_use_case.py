"""Change Member Grade use case."""

from datetime import datetime
from typing import List

from src.domain.entities.license import License, LicenseStatus, TechnicalGrade
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort

GRADE_RANGES = {TechnicalGrade.KYU: range(1, 7), TechnicalGrade.DAN: range(1, 11)}
TITLE_ONLY_GRADES = {"shidoin", "fukushidoin"}


def _is_title_only(license: License) -> bool:
    return license.grade.strip().lower() in TITLE_ONLY_GRADES


def _current_grade_licence(licences: List[License]) -> License:
    active = [l for l in licences if l.status == LicenseStatus.ACTIVE] or licences
    return max(active, key=lambda l: (not _is_title_only(l), l.expiration_date or datetime.min))


class ChangeMemberGradeUseCase:
    """Change the kyu or dan number of a member on their current grade licence."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, member_id: str, grade_number: int) -> License:
        """Execute the use case."""
        licences = await self.license_repository.find_by_member_id(member_id)
        if not licences:
            raise LicenseNotFoundError(member_id)

        license = _current_grade_licence(licences)
        if grade_number not in GRADE_RANGES[license.technical_grade]:
            raise ValidationError(f"Grade number {grade_number} is out of range for {license.technical_grade.value}")

        license.update_grade(f"{grade_number}º {license.technical_grade.value.capitalize()}")
        return await self.license_repository.update(license)
