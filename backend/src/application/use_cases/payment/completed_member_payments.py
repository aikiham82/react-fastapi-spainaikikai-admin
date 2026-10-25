"""Completed member payments that count as already paid for a payment year."""

from datetime import datetime
from typing import List, Optional

from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import (
    INSURANCE_PAYMENT_TYPES,
    MemberPayment,
    MemberPaymentStatus,
)


async def _payments_with_insurances_of(
    repository: MemberPaymentRepositoryPort,
    member_ids: List[str],
    payment_year: int,
    insurance_year: int,
    status: Optional[MemberPaymentStatus],
) -> List[MemberPayment]:
    in_payment_year = await repository.find_by_member_ids_year(member_ids, payment_year, status=status)
    in_insurance_year = (
        in_payment_year
        if insurance_year == payment_year
        else await repository.find_by_member_ids_year(member_ids, insurance_year, status=status)
    )
    return [
        mp for mp in in_payment_year if mp.payment_type not in INSURANCE_PAYMENT_TYPES
    ] + [mp for mp in in_insurance_year if mp.payment_type in INSURANCE_PAYMENT_TYPES]


async def find_completed_member_payments(
    repository: MemberPaymentRepositoryPort,
    member_ids: List[str],
    payment_year: int,
    today: datetime,
) -> List[MemberPayment]:
    """Licences and club fee count for the form year; insurances for the season in force today."""
    return await _payments_with_insurances_of(
        repository, member_ids, payment_year, insurance_season_year(today), MemberPaymentStatus.COMPLETED
    )


async def find_member_payments_shown_for_year(
    repository: MemberPaymentRepositoryPort,
    member_ids: List[str],
    payment_year: int,
    today: datetime,
    status: Optional[MemberPaymentStatus] = None,
) -> List[MemberPayment]:
    """The current calendar year shows the insurance in force today; any other year shows its own."""
    insurance_year = insurance_season_year(today) if payment_year == today.year else payment_year
    return await _payments_with_insurances_of(repository, member_ids, payment_year, insurance_year, status)
