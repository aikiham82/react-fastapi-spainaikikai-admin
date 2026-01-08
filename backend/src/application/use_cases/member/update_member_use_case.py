"""Update Member use case."""

from typing import Optional

from src.domain.entities.member import Member
from src.domain.exceptions.member import MemberNotFoundError
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

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(member, key):
                setattr(member, key, value)

        return await self.member_repository.update(member)
