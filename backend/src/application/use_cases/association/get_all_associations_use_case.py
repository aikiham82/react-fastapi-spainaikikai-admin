"""Get All Associations use case."""

from typing import List

from src.domain.entities.association import Association
from src.application.ports.association_repository import AssociationRepositoryPort


class GetAllAssociationsUseCase:
    """Use case for getting all associations."""

    def __init__(self, association_repository: AssociationRepositoryPort):
        self.association_repository = association_repository

    async def execute(self, limit: int = 100) -> List[Association]:
        """Execute the use case."""
        return await self.association_repository.find_all(limit)
