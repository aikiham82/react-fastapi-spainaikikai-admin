"""A member pays each licence, title or insurance once per year."""

from datetime import datetime
from typing import Iterable, Tuple

from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import INSURANCE_PAYMENT_TYPES, ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
from src.domain.exceptions.payment import DuplicatePaymentForYearError


async def refuse_lines_already_paid(
    member_payment_repository: MemberPaymentRepositoryPort,
    lines: Iterable[Tuple[str, str]],
    payment_year: int,
    paid_at: datetime,
) -> None:
    """Raise DuplicatePaymentForYearError for the first (member_id, item_type) already paid for its year."""
    for member_id, item_type in lines:
        line_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(item_type)
        if line_type is None:
            continue
        year = insurance_season_year(paid_at) if line_type in INSURANCE_PAYMENT_TYPES else payment_year
        if await member_payment_repository.exists_for_member_year_type(
            member_id=member_id, payment_year=year, payment_type=line_type,
        ):
            raise DuplicatePaymentForYearError(member_id, item_type, year)
