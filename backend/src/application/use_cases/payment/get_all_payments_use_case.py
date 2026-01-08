"""Get All Payments use case."""
from typing import Optional


from typing import List, Optional

from src.domain.entities.payment import Payment
from src.application.ports.payment_repository import PaymentRepositoryPort


class GetAllPaymentsUseCase:
    """Use case for getting all payments."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        limit: int = 100,
        club_id: Optional[str] = None,
        member_id: Optional[str] = None
    ) -> List[Payment]:
        """Execute to use case."""
        if member_id:
            return await self.payment_repository.find_by_member_id(member_id, limit)
        if club_id:
            return await self.payment_repository.find_by_club_id(club_id, limit)
        return await self.payment_repository.find_all(limit)
