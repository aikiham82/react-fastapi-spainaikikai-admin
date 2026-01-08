"""Delete Association use case."""

from src.domain.exceptions.association import AssociationNotFoundError
from src.application.ports.association_repository import AssociationRepositoryPort


class DeleteAssociationUseCase:
    """Use case for deleting an association."""

    def __init__(self, association_repository: AssociationRepositoryPort):
        self.association_repository = association_repository

    async def execute(self, association_id: str) -> bool:
        """Execute the use case."""
        if not await self.association_repository.exists(association_id):
            raise AssociationNotFoundError(association_id)

        return await self.association_repository.delete(association_id)
