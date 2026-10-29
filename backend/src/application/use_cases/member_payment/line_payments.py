"""Pair each member payment line with the transaction behind it."""

import asyncio
from dataclasses import dataclass
from typing import Dict, List, Optional

from src.application.ports.payment_repository import PaymentRepositoryPort
from src.domain.entities.member_payment import MemberPayment
from src.domain.entities.payment import Payment, PaymentStatus


@dataclass(frozen=True)
class LinePayment:
    paid: Optional[Payment] = None
    received_by_card: bool = False


async def line_payments_for(
    lines: List[MemberPayment], payment_repository: PaymentRepositoryPort
) -> List[LinePayment]:
    payment_ids = list({line.payment_id for line in lines if line.payment_id})
    found = await asyncio.gather(*(payment_repository.find_by_id(pid) for pid in payment_ids))
    parent_by_id: Dict[str, Payment] = {pid: payment for pid, payment in zip(payment_ids, found) if payment}
    result = []
    for line in lines:
        parent = parent_by_id.get(line.payment_id)
        paid = parent if parent and line.is_completed and parent.status == PaymentStatus.COMPLETED else None
        result.append(LinePayment(paid=paid, received_by_card=bool(parent and parent.is_received_by_card)))
    return result
