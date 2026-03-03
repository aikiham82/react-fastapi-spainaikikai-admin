"""Get All Payments use case."""

from typing import List, Optional

from src.domain.entities.payment import Payment
from src.application.ports.payment_repository import PaymentRepositoryPort


class GetAllPaymentsUseCase:
    """Use case for getting all payments."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        limit: int = 0,
        club_id: Optional[str] = None,
        member_id: Optional[str] = None,
        payment_year: Optional[int] = None
    ) -> List[Payment]:
        """Execute to use case."""
        # If payment_year is specified, use year filter
        if payment_year:
            payments = await self.payment_repository.find_by_year(payment_year, limit)
            # Apply additional filters if specified
            if member_id:
                payments = [p for p in payments if p.member_id == member_id]
            if club_id:
                payments = [p for p in payments if p.club_id == club_id]
            return payments

        # Original logic for non-year filtered queries
        if member_id:
            return await self.payment_repository.find_by_member_id(member_id, limit)
        if club_id:
            return await self.payment_repository.find_by_club_id(club_id, limit)
        return await self.payment_repository.find_all(limit)
