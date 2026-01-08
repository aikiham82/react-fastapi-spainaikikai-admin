"""Delete Member use case."""

from src.domain.exceptions.member import MemberNotFoundError
from src.application.ports.member_repository import MemberRepositoryPort


class DeleteMemberUseCase:
    """Use case for deleting a member."""

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, member_id: str) -> bool:
        """Execute the use case."""
        if not await self.member_repository.exists(member_id):
            raise MemberNotFoundError(member_id)

        return await self.member_repository.delete(member_id)
