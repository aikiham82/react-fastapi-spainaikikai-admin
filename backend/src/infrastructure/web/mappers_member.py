"""Member mapper for DTO to Entity conversion."""

from datetime import datetime
from src.domain.entities.member import Member, MemberStatus
from src.infrastructure.web.dto.member_dto import (
    MemberCreate,
    MemberUpdate,
    MemberResponse
)


class MemberMapper:
    """Mapper for Member entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: MemberCreate) -> Member:
        """Convert Create DTO to Domain Entity."""
        return Member(
            first_name=dto.first_name,
            last_name=dto.last_name,
            dni=dto.dni,
            email=dto.email,
            phone=dto.phone,
            address=dto.address,
            city=dto.city,
            province=dto.province,
            postal_code=dto.postal_code,
            country=dto.country,
            birth_date=dto.birth_date,
            club_id=dto.club_id,
            status=MemberStatus.ACTIVE,
            registration_date=datetime.utcnow()
        )

    @staticmethod
    def to_response_dto(entity: Member) -> MemberResponse:
        """Convert Domain Entity to Response DTO."""
        return MemberResponse(
            id=entity.id,
            first_name=entity.first_name,
            last_name=entity.last_name,
            dni=entity.dni,
            email=entity.email,
            phone=entity.phone,
            address=entity.address,
            city=entity.city,
            province=entity.province,
            postal_code=entity.postal_code,
            country=entity.country,
            birth_date=entity.birth_date,
            club_id=entity.club_id,
            status=entity.status.value,
            registration_date=entity.registration_date,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

    @staticmethod
    def update_entity_from_dto(entity: Member, dto: MemberUpdate) -> Member:
        """Update entity fields from Update DTO."""
        if dto.first_name is not None:
            entity.first_name = dto.first_name
        if dto.last_name is not None:
            entity.last_name = dto.last_name
        if dto.email is not None:
            entity.email = dto.email
        if dto.phone is not None:
            entity.phone = dto.phone
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
        if dto.birth_date is not None:
            entity.birth_date = dto.birth_date
        if dto.club_id is not None:
            entity.club_id = dto.club_id
        if dto.status is not None:
            if dto.status == "active":
                entity.activate()
            elif dto.status == "inactive":
                entity.deactivate()
            elif dto.status == "suspended":
                entity.suspend()
        return entity

    @staticmethod
    def to_response_list(entities: list[Member]) -> list[MemberResponse]:
        """Convert list of entities to list of DTOs."""
        return [MemberMapper.to_response_dto(entity) for entity in entities]
