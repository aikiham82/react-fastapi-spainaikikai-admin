"""Change Member Status use case."""

from src.domain.entities.member import Member, MemberStatus
from src.domain.exceptions.member import MemberNotFoundError, InvalidMemberDataError
from src.application.ports.member_repository import MemberRepositoryPort


class ChangeMemberStatusUseCase:
    """Use case for changing a member's status (activate/deactivate)."""

    ALLOWED_STATUSES = {MemberStatus.ACTIVE.value, MemberStatus.INACTIVE.value}

    def __init__(self, member_repository: MemberRepositoryPort):
        self.member_repository = member_repository

    async def execute(self, member_id: str, new_status: str) -> Member:
        """Execute the use case."""
        if new_status not in self.ALLOWED_STATUSES:
            raise InvalidMemberDataError(
                f"Invalid status '{new_status}'. Allowed: {', '.join(self.ALLOWED_STATUSES)}"
            )

        member = await self.member_repository.find_by_id(member_id)
        if member is None:
            raise MemberNotFoundError(member_id)

        if new_status == MemberStatus.ACTIVE.value:
            member.activate()
        else:
            member.deactivate()

        return await self.member_repository.update(member)
