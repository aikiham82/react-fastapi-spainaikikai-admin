"""Change Member Grade use case."""

from src.domain.entities.license import License, LicenseStatus, TechnicalGrade, grade_licence_among
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.license import LicenseNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort

GRADE_RANGES = {TechnicalGrade.KYU: range(1, 7), TechnicalGrade.DAN: range(1, 11)}


class ChangeMemberGradeUseCase:
    """Change the kyu or dan number of a member on their current grade licence."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(self, member_id: str, grade_number: int) -> License:
        """Execute the use case."""
        licences = await self.license_repository.find_by_member_id(member_id)
        license = grade_licence_among([l for l in licences if l.status == LicenseStatus.ACTIVE])
        if license is None:
            raise LicenseNotFoundError(member_id)

        if grade_number not in GRADE_RANGES[license.technical_grade]:
            raise ValidationError(f"No existe el {grade_number}.º {license.technical_grade.value.capitalize()}")

        license.update_grade(f"{grade_number}º {license.technical_grade.value.capitalize()}")
        return await self.license_repository.update(license)
