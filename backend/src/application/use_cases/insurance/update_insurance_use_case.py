"""Update Insurance use case."""

from datetime import datetime

from src.domain.entities.insurance import Insurance
from src.domain.exceptions.insurance import InsuranceNotFoundError
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class UpdateInsuranceUseCase:
    """Use case for updating an insurance."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(self, insurance_id: str, **kwargs) -> Insurance:
        """Execute to use case."""
        insurance = await self.insurance_repository.find_by_id(insurance_id)
        if insurance is None:
            raise InsuranceNotFoundError(insurance_id)

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(insurance, key):
                if key in ["start_date", "end_date"]:
                    value = datetime.fromisoformat(value) if isinstance(value, str) else value
                setattr(insurance, key, value)

        return await self.insurance_repository.update(insurance)
