"""Create Insurance use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
from src.domain.exceptions.insurance import InsuranceAlreadyExistsError
from src.application.ports.insurance_repository import InsuranceRepositoryPort


class CreateInsuranceUseCase:
    """Use case for creating a new insurance."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        member_id: Optional[str],
        club_id: Optional[str],
        insurance_type: str = "accident",
        policy_number: str,
        insurance_company: str,
        start_date: str,
        end_date: str,
        coverage_amount: Optional[float] = None,
        payment_id: Optional[str] = None
    ) -> Insurance:
        """Execute to use case."""
        # Check if insurance with same policy number exists
        existing = await self.insurance_repository.find_by_policy_number(policy_number)
        if existing:
            raise InsuranceAlreadyExistsError("Insurance with this policy number already exists")

        insurance = Insurance(
            member_id=member_id,
            club_id=club_id,
            insurance_type=InsuranceType(insurance_type),
            policy_number=policy_number,
            insurance_company=insurance_company,
            start_date=datetime.fromisoformat(start_date),
            end_date=datetime.fromisoformat(end_date),
            status=InsuranceStatus.ACTIVE,
            coverage_amount=coverage_amount,
            payment_id=payment_id
        )

        return await self.insurance_repository.create(insurance)
