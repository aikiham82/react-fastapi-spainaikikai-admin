"""Get Member use case."""

from src.domain.entities.member import Member
from src.domain.exceptions.member import MemberNotFoundError
from src.application.ports.member_repository import MemberRepositoryPort


class GetMemberUseCase:
    """Use case for getting a member by ID."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, member_id: str) -> Member:
        """Execute the use case."""
        member = await self.member_repository.find_by_id(member_id)
        if member is None:
            raise MemberNotFoundError(member_id)
        return member
