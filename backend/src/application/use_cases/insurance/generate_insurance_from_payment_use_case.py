"""Generate insurance automatically from completed annual payment."""

import logging
from datetime import datetime
from typing import List

from src.domain.entities.insurance import Insurance, InsuranceType, InsuranceStatus
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType
from src.application.ports.insurance_repository import InsuranceRepositoryPort

logger = logging.getLogger(__name__)

# Mapping from MemberPaymentType to InsuranceType
PAYMENT_TYPE_TO_INSURANCE_TYPE = {
    MemberPaymentType.SEGURO_ACCIDENTES: InsuranceType.ACCIDENT,
    MemberPaymentType.SEGURO_RC: InsuranceType.CIVIL_LIABILITY,
}


class GenerateInsuranceFromPaymentUseCase:
    """Generate Insurance entities from completed member payments."""

    def __init__(self, insurance_repository: InsuranceRepositoryPort):
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        member_payments: List[MemberPayment],
        payment_id: str,
        payment_year: int,
    ) -> List[Insurance]:
        """Generate insurance for each insurance-type member payment.

        Args:
            member_payments: List of MemberPayment records (already filtered to insurance types).
            payment_id: The parent payment ID.
            payment_year: The year of the payment (determines insurance validity period).

        Returns:
            List of created Insurance entities.
        """
        created_insurances: List[Insurance] = []
        start_date = datetime(payment_year, 1, 1)
        end_date = datetime(payment_year, 12, 31, 23, 59, 59)

        for mp in member_payments:
            insurance_type = PAYMENT_TYPE_TO_INSURANCE_TYPE.get(mp.payment_type)
            if not insurance_type:
                continue

            # Idempotency: check if insurance already exists for this member+year+type
            existing = await self.insurance_repository.find_active_by_member_year_type(
                member_id=mp.member_id,
                payment_year=payment_year,
                insurance_type=insurance_type,
            )
            if existing:
                logger.info(
                    "Insurance already exists for member %s, type %s, year %d — skipping",
                    mp.member_id, mp.payment_type.value, payment_year
                )
                continue

            insurance = Insurance(
                member_id=mp.member_id,
                insurance_type=insurance_type,
                policy_number="PENDIENTE",
                insurance_company="Spain Aikikai",
                start_date=start_date,
                end_date=end_date,
                status=InsuranceStatus.ACTIVE,
                payment_id=payment_id,
            )

            created = await self.insurance_repository.create(insurance)
            created_insurances.append(created)
            logger.info(
                "Created insurance for member %s (type: %s, year: %d)",
                mp.member_id, insurance_type.value, payment_year
            )

        return created_insurances
