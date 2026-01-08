"""License mapper for DTO to Entity conversion."""

from src.domain.entities.license import License, LicenseStatus, LicenseType
from src.infrastructure.web.dto.license_dto import (
    LicenseCreate,
    LicenseUpdate,
    LicenseRenewRequest,
    LicenseResponse
)


class LicenseMapper:
    """Mapper for License entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: LicenseCreate) -> License:
        """Convert Create DTO to Domain Entity."""
        return License(
            license_number=dto.license_number,
            member_id=dto.member_id,
            club_id=dto.club_id,
            association_id=dto.association_id,
            license_type=LicenseType(dto.license_type),
            grade=dto.grade,
            status=LicenseStatus.ACTIVE,
            issue_date=dto.issue_date,
            expiration_date=dto.expiration_date,
            is_renewed=False
        )

    @staticmethod
    def to_response_dto(entity: License) -> LicenseResponse:
        """Convert Domain Entity to Response DTO."""
        return LicenseResponse(
            id=entity.id,
            license_number=entity.license_number,
            member_id=entity.member_id,
            club_id=entity.club_id,
            association_id=entity.association_id,
            license_type=entity.license_type.value,
            grade=entity.grade,
            status=entity.status.value,
            issue_date=entity.issue_date,
            expiration_date=entity.expiration_date,
            renewal_date=entity.renewal_date,
            is_renewed=entity.is_renewed
        )

    @staticmethod
    def update_entity_from_dto(entity: License, dto: LicenseUpdate) -> License:
        """Update entity fields from Update DTO."""
        if dto.grade is not None:
            entity.update_grade(dto.grade)
        if dto.expiration_date is not None:
            entity.renew(dto.expiration_date)
        return entity

    @staticmethod
    def renew_from_dto(entity: License, dto: LicenseRenewRequest) -> License:
        """Renew license entity from DTO."""
        entity.renew(dto.expiration_date)
        return entity

    @staticmethod
    def to_response_list(entities: list[License]) -> list[LicenseResponse]:
        """Convert list of entities to list of DTOs."""
        return [LicenseMapper.to_response_dto(entity) for entity in entities]
