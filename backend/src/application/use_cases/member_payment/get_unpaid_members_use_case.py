"""Get Unpaid Members use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Set

from src.domain.entities.member_payment import MemberPaymentType, MemberPaymentStatus
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class UnpaidMemberInfo:
    """Information about an unpaid member."""
    member_id: str
    member_name: str
    email: str
    dni: str


@dataclass
class UnpaidMembersResult:
    """Result containing list of unpaid members."""
    club_id: str
    payment_year: int
    payment_type: Optional[str]
    unpaid_members: List[UnpaidMemberInfo]
    total_count: int


class GetUnpaidMembersUseCase:
    """Use case for getting members who haven't paid for a specific item."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository

    async def execute(
        self,
        club_id: str,
        payment_year: Optional[int] = None,
        payment_type: Optional[str] = None
    ) -> UnpaidMembersResult:
        """
        Get members who haven't paid for a specific item type.

        Args:
            club_id: The club ID to check.
            payment_year: The year to check. Defaults to current year.
            payment_type: The payment type to filter by (optional).

        Returns:
            UnpaidMembersResult with list of unpaid members.
        """
        if payment_year is None:
            payment_year = datetime.now().year

        # Convert string payment_type to enum if provided
        payment_type_enum = None
        if payment_type:
            try:
                payment_type_enum = MemberPaymentType(payment_type)
            except ValueError:
                raise ValueError(f"Invalid payment type: {payment_type}")

        # Get all active members for the club
        members = await self.member_repository.find_by_club_id(club_id, limit=1000)
        all_member_ids = {m.id for m in members if m.id and m.status.value == "active"}

        if not all_member_ids:
            return UnpaidMembersResult(
                club_id=club_id,
                payment_year=payment_year,
                payment_type=payment_type,
                unpaid_members=[],
                total_count=0
            )

        # Get completed payments for these members
        payments = await self.member_payment_repository.find_by_member_ids_year(
            member_ids=list(all_member_ids),
            payment_year=payment_year,
            status=MemberPaymentStatus.COMPLETED
        )

        # Find members who have paid
        paid_member_ids: Set[str] = set()
        for payment in payments:
            if payment_type_enum is None or payment.payment_type == payment_type_enum:
                paid_member_ids.add(payment.member_id)

        # Get unpaid member IDs
        unpaid_member_ids = all_member_ids - paid_member_ids

        # Build member info list
        unpaid_members = []
        for member in members:
            if member.id in unpaid_member_ids:
                unpaid_members.append(UnpaidMemberInfo(
                    member_id=member.id,
                    member_name=member.get_full_name(),
                    email=member.email or "",
                    dni=member.dni or ""
                ))

        return UnpaidMembersResult(
            club_id=club_id,
            payment_year=payment_year,
            payment_type=payment_type,
            unpaid_members=unpaid_members,
            total_count=len(unpaid_members)
        )
