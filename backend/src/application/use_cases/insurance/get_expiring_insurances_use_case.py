"""Get Expiring Insurances use case."""

from typing import List

from src.domain.entities.insurance import Insurance
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class GetExpiringInsurancesUseCase:
    """Use case for getting insurances expiring soon."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(self, days_threshold: int = 30, limit: int = 100) -> List[Insurance]:
        """Execute to use case."""
        return await self.insurance_repository.find_expiring_soon(days_threshold, limit)
