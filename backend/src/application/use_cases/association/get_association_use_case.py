"""Get Association use case."""

from src.domain.entities.association import Association
from src.domain.exceptions.association import AssociationNotFoundError
from src.application.ports.association_repository import AssociationRepositoryPort


class GetAssociationUseCase:
    """Use case for getting an association by ID."""

    def __init__(self, association_repository: AssociationRepositoryPort):
        self.association_repository = association_repository

    async def execute(self, association_id: str) -> Association:
        """Execute the use case."""
        association = await self.association_repository.find_by_id(association_id)
        if association is None:
            raise AssociationNotFoundError(association_id)
        return association
