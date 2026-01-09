"""Club mapper for DTO to Entity conversion."""

from src.domain.entities.club import Club
from src.infrastructure.web.dto.club_dto import (
    ClubCreate,
    ClubUpdate,
    ClubResponse
)


class ClubMapper:
    """Mapper for Club entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: ClubCreate) -> Club:
        """Convert Create DTO to Domain Entity."""
        return Club(
            name=dto.name,
            address=dto.address,
            city=dto.city,
            province=dto.province,
            postal_code=dto.postal_code,
            country=dto.country,
            phone=dto.phone,
            email=dto.email,
            association_id=dto.association_id,
            is_active=True
        )

    @staticmethod
    def to_response_dto(entity: Club) -> ClubResponse:
        """Convert Domain Entity to Response DTO."""
        return ClubResponse(
            id=entity.id,
            name=entity.name,
            address=entity.address,
            city=entity.city,
            province=entity.province,
            postal_code=entity.postal_code,
            country=entity.country,
            phone=entity.phone,
            email=entity.email,
            association_id=entity.association_id,
            is_active=entity.is_active,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

    @staticmethod
    def update_entity_from_dto(entity: Club, dto: ClubUpdate) -> Club:
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
        if dto.association_id is not None:
            entity.association_id = dto.association_id
        if dto.is_active is not None:
            if dto.is_active:
                entity.activate()
            else:
                entity.deactivate()
        return entity

    @staticmethod
    def to_response_list(entities: list[Club]) -> list[ClubResponse]:
        """Convert list of entities to list of DTOs."""
        return [ClubMapper.to_response_dto(entity) for entity in entities]
