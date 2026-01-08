"""Seminar mapper for DTO to Entity conversion."""

from src.domain.entities.seminar import Seminar, SeminarStatus
from src.infrastructure.web.dto.seminar_dto import (
    SeminarCreate,
    SeminarUpdate,
    SeminarResponse
)


class SeminarMapper:
    """Mapper for Seminar entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: SeminarCreate) -> Seminar:
        """Convert Create DTO to Domain Entity."""
        return Seminar(
            title=dto.title,
            description=dto.description,
            instructor_name=dto.instructor_name,
            venue=dto.venue,
            address=dto.address,
            city=dto.city,
            province=dto.province,
            start_date=dto.start_date,
            end_date=dto.end_date,
            price=dto.price,
            max_participants=dto.max_participants,
            club_id=dto.club_id,
            association_id=dto.association_id,
            status=SeminarStatus.UPCOMING,
            current_participants=0
        )

    @staticmethod
    def to_response_dto(entity: Seminar) -> SeminarResponse:
        """Convert Domain Entity to Response DTO."""
        return SeminarResponse(
            id=entity.id,
            title=entity.title,
            description=entity.description,
            instructor_name=entity.instructor_name,
            venue=entity.venue,
            address=entity.address,
            city=entity.city,
            province=entity.province,
            start_date=entity.start_date,
            end_date=entity.end_date,
            price=entity.price,
            max_participants=entity.max_participants,
            current_participants=entity.current_participants,
            club_id=entity.club_id,
            association_id=entity.association_id,
            status=entity.status.value
        )

    @staticmethod
    def update_entity_from_dto(entity: Seminar, dto: SeminarUpdate) -> Seminar:
        """Update entity fields from Update DTO."""
        if dto.title is not None:
            entity.title = dto.title
        if dto.description is not None:
            entity.description = dto.description
        if dto.instructor_name is not None:
            entity.instructor_name = dto.instructor_name
        if dto.venue is not None:
            entity.venue = dto.venue
        if dto.address is not None:
            entity.address = dto.address
        if dto.city is not None:
            entity.city = dto.city
        if dto.province is not None:
            entity.province = dto.province
        if dto.start_date is not None and dto.end_date is not None:
            entity.update_dates(dto.start_date, dto.end_date)
        if dto.price is not None:
            entity.update_price(dto.price)
        if dto.max_participants is not None:
            entity.max_participants = dto.max_participants
        return entity

    @staticmethod
    def to_response_list(entities: list[Seminar]) -> list[SeminarResponse]:
        """Convert list of entities to list of DTOs."""
        return [SeminarMapper.to_response_dto(entity) for entity in entities]
