"""Update Member use case."""

from typing import Optional
from datetime import datetime

from src.domain.entities.member import Member, is_club_account_placeholder_name
from src.domain.exceptions.member import (
    InvalidClubForMemberError,
    InvalidMemberDataError,
    MemberAlreadyExistsError,
    MemberNotFoundError,
)
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.use_cases.apply_changes import apply_changes


class UpdateMemberUseCase:
    """Use case for updating a member."""

    def __init__(self, member_repository: MemberRepositoryPort, club_repository: ClubRepositoryPort):
        self.member_repository = member_repository
        self.club_repository = club_repository

    async def execute(
        self,
        member_id: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        dni: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        postal_code: Optional[str] = None,
        country: Optional[str] = None,
        birth_date: Optional[datetime] = None,
        club_id: Optional[str] = None,
        registration_date: Optional[datetime] = None,
    ) -> Member:
        """Execute the use case."""
        member = await self.member_repository.find_by_id(member_id)
        if member is None:
            raise MemberNotFoundError(member_id)
        if is_club_account_placeholder_name(last_name) and not member.is_club_account_placeholder:
            raise InvalidMemberDataError("Ese apellido está reservado para las cuentas de club")

        if dni is not None:
            dni = dni.strip()
            if dni and dni != member.dni:
                holder = await self.member_repository.find_by_dni(dni)
                if holder and holder.id != member.id:
                    raise MemberAlreadyExistsError("Ya existe un miembro con ese DNI")

        if club_id and club_id != member.club_id and not await self.club_repository.exists(club_id):
            raise InvalidClubForMemberError("El club indicado no existe")

        return await self.member_repository.update(
            apply_changes(
                member,
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
                registration_date=registration_date,
            )
        )
