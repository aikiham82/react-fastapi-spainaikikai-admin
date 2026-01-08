"""Get All Insurances use case."""
from typing import Optional


from typing import List, Optional

from src.domain.entities.insurance import Insurance
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class GetAllInsurancesUseCase:
    """Use case for getting all insurances."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        limit: int = 100,
        club_id: Optional[str] = None,
        member_id: Optional[str] = None
    ) -> List[Insurance]:
        """Execute to use case."""
        if member_id:
            return await self.insurance_repository.find_by_member_id(member_id, limit)
        if club_id:
            return await self.insurance_repository.find_by_club_id(club_id, limit)
        return await self.insurance_repository.find_all(limit)
