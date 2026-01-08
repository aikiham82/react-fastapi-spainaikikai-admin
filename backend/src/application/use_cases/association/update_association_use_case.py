"""Update Association use case."""

from src.domain.entities.association import Association
from src.domain.exceptions.association import AssociationNotFoundError
from src.application.ports.association_repository import AssociationRepositoryPort


class UpdateAssociationUseCase:
    """Use case for updating an association."""

    def __init__(self, association_repository: AssociationRepositoryPort):
        self.association_repository = association_repository

    async def execute(self, association_id: str, **kwargs) -> Association:
        """Execute the use case."""
        association = await self.association_repository.find_by_id(association_id)
        if association is None:
            raise AssociationNotFoundError(association_id)

        # Update fields
        for key, value in kwargs.items():
            if value is not None and hasattr(association, key):
                setattr(association, key, value)

        return await self.association_repository.update(association)
