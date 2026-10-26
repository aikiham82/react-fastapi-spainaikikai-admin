"""Update Member use case."""

from src.domain.entities.member import Member, is_club_account_placeholder_name
from src.domain.exceptions.member import InvalidMemberDataError, MemberAlreadyExistsError, MemberNotFoundError
from src.application.ports.member_repository import MemberRepositoryPort


class UpdateMemberUseCase:
    """Use case for updating a member."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, member_id: str, **kwargs) -> Member:
        """Execute the use case."""
        member = await self.member_repository.find_by_id(member_id)
        if member is None:
            raise MemberNotFoundError(member_id)
        if is_club_account_placeholder_name(kwargs.get("last_name")) and not member.is_club_account_placeholder:
            raise InvalidMemberDataError("That last name is reserved for club accounts")

        if kwargs.get("dni") is not None:
            kwargs["dni"] = kwargs["dni"].strip()
            if kwargs["dni"] and kwargs["dni"] != member.dni:
                holder = await self.member_repository.find_by_dni(kwargs["dni"])
                if holder and holder.id != member.id:
                    raise MemberAlreadyExistsError("Ya existe un miembro con ese DNI")

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(member, key):
                setattr(member, key, value)

        return await self.member_repository.update(member)
