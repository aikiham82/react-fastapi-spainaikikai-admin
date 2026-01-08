"""Get Insurance use case."""

from src.domain.entities.insurance import Insurance
from src.domain.exceptions.insurance import InsuranceNotFoundError
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class GetInsuranceUseCase:
    """Use case for getting an insurance by ID."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(self, insurance_id: str) -> Insurance:
        """Execute to use case."""
        insurance = await self.insurance_repository.find_by_id(insurance_id)
        if insurance is None:
            raise InsuranceNotFoundError(insurance_id)
        return insurance
