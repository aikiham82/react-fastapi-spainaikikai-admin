"""Create Member use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.member import Member, MemberStatus
from src.domain.exceptions.member import MemberAlreadyExistsError, InvalidClubForMemberError
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort


class CreateMemberUseCase:
    """Use case for creating a new member."""

    def __init__(
        self,
        member_repository: MemberRepositoryPort,
        club_repository: ClubRepositoryPort
    ):
        self.member_repository = member_repository
        self.club_repository = club_repository

    async def execute(
        self,
        first_name: str,
        last_name: str,
        dni: str,
        email: str,
        phone: str,
        address: str,
        city: str,
        province: str,
        postal_code: str,
        country: str = "Spain",
        club_id: Optional[str] = None,
        birth_date: Optional[datetime] = None
    ) -> Member:
        """Execute the use case."""
        # Check if member with same DNI exists
        existing_dni = await self.member_repository.find_by_dni(dni)
        if existing_dni:
            raise MemberAlreadyExistsError("Member with this DNI already exists")

        # Check if member with same email exists
        existing_email = await self.member_repository.find_by_email(email)
        if existing_email:
            raise MemberAlreadyExistsError("Member with this email already exists")

        # Validate club if provided
        if club_id and not await self.club_repository.exists(club_id):
            raise InvalidClubForMemberError(f"Club with id {club_id} not found")

        member = Member(
            first_name=first_name,
            last_name=last_name,
            dni=dni,
            email=email,
            phone=phone,
            address=address,
            city=city,
            province=province,
            postal_code=postal_code,
            country=country,
            birth_date=birth_date,
            club_id=club_id,
            status=MemberStatus.ACTIVE,
            registration_date=datetime.utcnow()
        )

        return await self.member_repository.create(member)
