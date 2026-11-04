"""A club admin pays only the licence or title that fits the member."""

from collections import defaultdict
from datetime import datetime
from typing import Iterable, Tuple

from src.application.ports.license_repository import LicenseRepositoryPort
from src.domain.entities.license import LICENCE_ITEMS, payable_licence_items
from src.domain.entities.member import Member
from src.domain.entities.member_payment import ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE, PAYMENT_TYPE_LABELS
from src.domain.exceptions.payment import InvalidPaymentDataError


async def refuse_licences_that_do_not_fit(
    license_repository: LicenseRepositoryPort,
    members: Iterable[Member],
    lines: Iterable[Tuple[str, str]],
    today: datetime,
) -> None:
    """Raise InvalidPaymentDataError for the first (member_id, item_type) the member's licences do not allow."""
    licence_lines = [(member_id, item) for member_id, item in lines if item in LICENCE_ITEMS]
    if not licence_lines:
        return

    members_by_id = {member.id: member for member in members}
    held = defaultdict(list)
    for licence in await license_repository.find_by_member_ids(list({member_id for member_id, _ in licence_lines})):
        held[licence.member_id].append(licence)

    for member_id, item in licence_lines:
        member = members_by_id[member_id]
        if item not in payable_licence_items(held[member_id], member.birth_date, today):
            concept = PAYMENT_TYPE_LABELS[ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE[item].value]
            raise InvalidPaymentDataError(
                f"{member.first_name} {member.last_name} no puede pagar {concept}: no corresponde a su licencia"
            )
