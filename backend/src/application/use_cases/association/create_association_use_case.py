"""Create Association use case."""

from src.domain.entities.association import Association
from src.domain.exceptions.association import AssociationAlreadyExistsError
from src.application.ports.association_repository import AssociationRepositoryPort


class CreateAssociationUseCase:
    """Use case for creating a new association."""

    def __init__(self, association_repository: AssociationRepositoryPort):
        self.association_repository = association_repository

    async def execute(self, name: str, address: str, city: str, province: str,
                     postal_code: str, country: str, phone: str, email: str, cif: str) -> Association:
        """Execute the use case."""
        # Check if association with same email exists
        existing = await self.association_repository.find_by_email(email)
        if existing:
            raise AssociationAlreadyExistsError("Association with this email already exists")

        association = Association(
            name=name,
            address=address,
            city=city,
            province=province,
            postal_code=postal_code,
            country=country,
            phone=phone,
            email=email,
            cif=cif
        )

        return await self.association_repository.create(association)
