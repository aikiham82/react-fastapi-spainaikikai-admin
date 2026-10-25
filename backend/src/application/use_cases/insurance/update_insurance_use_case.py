"""Update Insurance use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.insurance import InsuranceNotFoundError
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class UpdateInsuranceUseCase:
    """Use case for updating an insurance."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        insurance_id: str,
        insurance_type: Optional[str] = None,
        insurance_company: Optional[str] = None,
        policy_number: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        coverage_amount: Optional[float] = None,
        annulled: Optional[bool] = None,
    ) -> Insurance:
        """Execute the use case."""
        insurance = await self.insurance_repository.find_by_id(insurance_id)
        if insurance is None:
            raise InsuranceNotFoundError(insurance_id)

        if insurance_type is not None:
            insurance.insurance_type = InsuranceType(insurance_type)
        try:
            insurance.update_identity(insurance_company, policy_number)
            new_start = start_date or insurance.start_date
            new_end = end_date or insurance.end_date
            if new_start and new_end:
                insurance.update_dates(new_start, new_end)
            else:
                insurance.start_date, insurance.end_date = new_start, new_end
            if coverage_amount is not None:
                insurance.update_coverage(coverage_amount)
        except ValueError as error:
            raise ValidationError(str(error)) from error

        if annulled:
            insurance.cancel()
        elif annulled is False:
            insurance.activate()

        return await self.insurance_repository.update(insurance)
