"""Generate insurance automatically from completed annual payment."""

import logging
from datetime import datetime
from typing import List

from src.domain.entities.insurance import (
    Insurance,
    InsuranceStatus,
    InsuranceType,
    insurance_season,
    insurance_season_year,
)
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
        paid_at: datetime,
    ) -> List[Insurance]:
        """Generate insurance for each insurance-type member payment.

        Args:
            member_payments: List of MemberPayment records (already filtered to insurance types).
            payment_id: The parent payment ID.
            paid_at: When the payment was completed. The insurance covers the season in force on that date.

        Returns:
            List of created Insurance entities.
        """
        created_insurances: List[Insurance] = []
        season_year = insurance_season_year(paid_at)
        start_date, end_date = insurance_season(season_year)

        for mp in member_payments:
            insurance_type = PAYMENT_TYPE_TO_INSURANCE_TYPE.get(mp.payment_type)
            if not insurance_type:
                continue

            # Idempotency: check if insurance already exists for this member+season+type
            existing = await self.insurance_repository.find_active_by_member_year_type(
                member_id=mp.member_id,
                payment_year=season_year,
                insurance_type=insurance_type,
            )
            if existing:
                logger.info(
                    "Insurance already exists for member %s, type %s, season %d — skipping",
                    mp.member_id, mp.payment_type.value, season_year
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
                "Created insurance for member %s (type: %s, season: %d)",
                mp.member_id, insurance_type.value, season_year
            )

        return created_insurances
