"""Association mapper for DTO to Entity conversion."""

from src.domain.entities.association import Association
from src.infrastructure.web.dto.association_dto import (
    AssociationCreate,
    AssociationUpdate,
    AssociationResponse
)


class AssociationMapper:
    """Mapper for Association entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: AssociationCreate) -> Association:
        """Convert Create DTO to Domain Entity."""
        return Association(
            name=dto.name,
            address=dto.address,
            city=dto.city,
            province=dto.province,
            postal_code=dto.postal_code,
            country=dto.country,
            phone=dto.phone,
            email=dto.email,
            cif=dto.cif,
            is_active=True
        )

    @staticmethod
    def to_response_dto(entity: Association) -> AssociationResponse:
        """Convert Domain Entity to Response DTO."""
        return AssociationResponse(
            id=entity.id,
            name=entity.name,
            address=entity.address,
            city=entity.city,
            province=entity.province,
            postal_code=entity.postal_code,
            country=entity.country,
            phone=entity.phone,
            email=entity.email,
            cif=entity.cif,
            is_active=entity.is_active,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

    @staticmethod
    def update_entity_from_dto(entity: Association, dto: AssociationUpdate) -> Association:
        """Update entity fields from Update DTO."""
        if dto.name is not None:
            entity.name = dto.name
        if dto.address is not None:
            entity.address = dto.address
        if dto.city is not None:
            entity.city = dto.city
        if dto.province is not None:
            entity.province = dto.province
        if dto.postal_code is not None:
            entity.postal_code = dto.postal_code
        if dto.country is not None:
            entity.country = dto.country
        if dto.phone is not None:
            entity.phone = dto.phone
        if dto.email is not None:
            entity.email = dto.email
        if dto.is_active is not None:
            if dto.is_active:
                entity.activate()
            else:
                entity.deactivate()
        return entity

    @staticmethod
    def to_response_list(entities: list[Association]) -> list[AssociationResponse]:
        """Convert list of entities to list of DTOs."""
        return [AssociationMapper.to_response_dto(entity) for entity in entities]
