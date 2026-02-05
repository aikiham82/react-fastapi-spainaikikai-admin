"""Get All Insurances use case."""

from typing import List, Optional

from src.domain.entities.insurance import Insurance
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


class GetAllInsurancesUseCase:
    """Use case for getting all insurances."""

    def __init__(
        self,
        insurance_repository: InsuranceRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.insurance_repository = insurance_repository
        self.member_repository = member_repository

    async def execute(
        self,
        limit: int = 100,
        club_id: Optional[str] = None,
        member_id: Optional[str] = None
    ) -> List[Insurance]:
        """Execute the use case.

        Args:
            limit: Maximum number of insurances to return.
            club_id: Optional club ID to filter by (looks up members first).
            member_id: Optional member ID to filter by.

        Returns:
            List of insurances matching the criteria.
        """
        if member_id:
            return await self.insurance_repository.find_by_member_id(member_id, limit)
        if club_id:
            # Get all member IDs for the club, then find their insurances
            members = await self.member_repository.find_by_club_id(club_id, limit=1000)
            member_ids = [m.id for m in members if m.id]
            if not member_ids:
                return []
            return await self.insurance_repository.find_by_member_ids(member_ids, limit)
        return await self.insurance_repository.find_all(limit)
