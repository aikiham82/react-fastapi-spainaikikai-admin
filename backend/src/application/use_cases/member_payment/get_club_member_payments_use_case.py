"""Get all MemberPayments for a club in a given year."""

from dataclasses import dataclass
from typing import List

from src.domain.entities.member_payment import MemberPayment
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class MemberPaymentWithMember:
    """A MemberPayment enriched with the human-readable member name.

    The transactions view needs the member's name (not the raw member_id) so the
    admin can tell whose payment they are editing/deleting.
    """
    payment: MemberPayment
    member_name: str


class GetClubMemberPaymentsUseCase:
    """Use case for listing all MemberPayment records for a club by year.

    Because MemberPayment has no club_id, the lookup goes:
    club_id -> member_ids (via member_repository) -> MemberPayments.

    Members are already loaded to resolve the ids, so we reuse them to attach the
    member name to each payment at no extra query cost.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(
        self, club_id: str, payment_year: int
    ) -> List[MemberPaymentWithMember]:
        members = await self.member_repository.find_by_club_id(club_id)
        if not members:
            return []
        member_ids = [m.id for m in members if m.id]
        if not member_ids:
            return []
        name_by_id = {m.id: m.get_full_name() for m in members if m.id}
        payments = await self.member_payment_repository.find_by_member_ids_year(
            member_ids=member_ids,
            payment_year=payment_year,
        )
        return [
            MemberPaymentWithMember(
                payment=p,
                # Fall back to the id if a name can't be resolved, so the row is
                # never blank.
                member_name=name_by_id.get(p.member_id, p.member_id),
            )
            for p in payments
        ]
