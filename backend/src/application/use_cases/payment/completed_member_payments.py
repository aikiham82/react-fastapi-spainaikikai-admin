"""Completed member payments that count as already paid for a payment year."""

from datetime import datetime
from typing import List

from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import (
    INSURANCE_PAYMENT_TYPES,
    MemberPayment,
    MemberPaymentStatus,
)


async def find_completed_member_payments(
    repository: MemberPaymentRepositoryPort,
    member_ids: List[str],
    payment_year: int,
    today: datetime,
) -> List[MemberPayment]:
    """Licences and club fee count for the form year; insurances for the season in force today."""
    in_form_year = await repository.find_by_member_ids_year(
        member_ids, payment_year, status=MemberPaymentStatus.COMPLETED
    )
    season_year = insurance_season_year(today)
    in_season_year = (
        in_form_year
        if season_year == payment_year
        else await repository.find_by_member_ids_year(
            member_ids, season_year, status=MemberPaymentStatus.COMPLETED
        )
    )
    return [
        mp for mp in in_form_year if mp.payment_type not in INSURANCE_PAYMENT_TYPES
    ] + [mp for mp in in_season_year if mp.payment_type in INSURANCE_PAYMENT_TYPES]
