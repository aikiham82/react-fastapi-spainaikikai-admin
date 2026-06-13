"""Get all MemberPayments for a club in a given year."""

from typing import List

from src.domain.entities.member_payment import MemberPayment
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


class GetClubMemberPaymentsUseCase:
    """Use case for listing all MemberPayment records for a club by year.

    Because MemberPayment has no club_id, the lookup goes:
    club_id -> member_ids (via member_repository) -> MemberPayments.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(self, club_id: str, payment_year: int) -> List[MemberPayment]:
        members = await self.member_repository.find_by_club_id(club_id)
        if not members:
            return []
        member_ids = [m.id for m in members if m.id]
        if not member_ids:
            return []
        return await self.member_payment_repository.find_by_member_ids_year(
            member_ids=member_ids,
            payment_year=payment_year,
        )
