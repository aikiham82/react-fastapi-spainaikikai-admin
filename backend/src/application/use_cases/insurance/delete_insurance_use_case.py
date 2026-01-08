"""Delete Insurance use case."""

from src.domain.exceptions.insurance import InsuranceNotFoundError
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class DeleteInsuranceUseCase:
    """Use case for deleting an insurance."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(self, insurance_id: str) -> bool:
        """Execute to use case."""
        if not await self.insurance_repository.exists(insurance_id):
            raise InsuranceNotFoundError(insurance_id)

        return await self.insurance_repository.delete(insurance_id)
