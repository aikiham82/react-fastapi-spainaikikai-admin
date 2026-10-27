"""Change Member Grade use case."""

from typing import Optional

from src.domain.entities.license import License, LicenseStatus, grade_licence_among
from src.domain.entities.member import MemberStatus
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.license import LicenseNotFoundError
from src.domain.exceptions.member import InactiveMemberError, MemberNotFoundError
from src.domain.exceptions.user import AccessChangeNotAllowedError
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


class ChangeMemberGradeUseCase:
    """Change the kyu or dan number of a member on their current grade licence.

    A club admin (changed_by_member_id set) cannot change their own grade or the
    grade of a deregistered member; the federation (None) can.
    """

    def __init__(self, license_repository: LicenseRepositoryPort, member_repository: MemberRepositoryPort):
        self.license_repository = license_repository
        self.member_repository = member_repository

    async def execute(self, member_id: str, grade_number: int, changed_by_member_id: Optional[str]) -> License:
        """Execute the use case."""
        if changed_by_member_id is not None:
            await self._check_club_admin_may_change(member_id, changed_by_member_id)

        licences = await self.license_repository.find_by_member_id(member_id)
        license = grade_licence_among([l for l in licences if l.status == LicenseStatus.ACTIVE])
        if license is None:
            raise LicenseNotFoundError(member_id)

        try:
            license.change_grade_number(grade_number)
        except ValueError as error:
            raise ValidationError(str(error)) from error
        return await self.license_repository.update(license)

    async def _check_club_admin_may_change(self, member_id: str, changed_by_member_id: str) -> None:
        if member_id == changed_by_member_id:
            raise AccessChangeNotAllowedError("A club admin cannot change their own grade")
        member = await self.member_repository.find_by_id(member_id)
        if member is None:
            raise MemberNotFoundError(member_id)
        if member.status == MemberStatus.INACTIVE:
            raise InactiveMemberError("The grade of a deregistered member is history")
