"""Update Insurance use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
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
        if insurance_company is not None:
            insurance.insurance_company = insurance_company
        if policy_number is not None:
            insurance.policy_number = policy_number
        try:
            if start_date is not None or end_date is not None:
                insurance.update_dates(start_date or insurance.start_date, end_date or insurance.end_date)
            if coverage_amount is not None:
                insurance.update_coverage(coverage_amount)
        except ValueError as error:
            raise ValidationError(str(error)) from error

        if annulled:
            insurance.cancel()
        elif annulled is False:
            insurance.status = InsuranceStatus.ACTIVE

        return await self.insurance_repository.update(insurance)
