"""License mapper for DTO to Entity conversion."""

from src.domain.entities.license import (
    License, LicenseStatus, LicenseType,
    TechnicalGrade, InstructorCategory, AgeCategory
)
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
        """Convert Create DTO to Domain Entity.

        Note: club_id is no longer passed - it's derived from the member.
        """
        # Parse category fields with defaults
        technical_grade = TechnicalGrade(dto.technical_grade) if dto.technical_grade else TechnicalGrade.KYU
        instructor_category = InstructorCategory(dto.instructor_category) if dto.instructor_category else InstructorCategory.NONE
        age_category = AgeCategory(dto.age_category) if dto.age_category else AgeCategory.ADULTO

        return License(
            license_number=dto.license_number,
            member_id=dto.member_id,
            association_id=dto.association_id,
            license_type=LicenseType(dto.license_type),
            grade=dto.grade,
            status=LicenseStatus.ACTIVE,
            issue_date=dto.issue_date,
            expiration_date=dto.expiration_date,
            is_renewed=False,
            technical_grade=technical_grade,
            instructor_category=instructor_category,
            age_category=age_category
        )

    @staticmethod
    def to_response_dto(entity: License) -> LicenseResponse:
        """Convert Domain Entity to Response DTO.

        Note: club_id is no longer included - frontend should get it from member.
        """
        # Generate image URL for active licenses with a member
        image_url = None
        if entity.id and entity.member_id:
            image_url = f"/api/v1/licenses/{entity.id}/image"

        return LicenseResponse(
            id=entity.id,
            license_number=entity.license_number,
            member_id=entity.member_id,
            association_id=entity.association_id,
            license_type=entity.license_type.value,
            grade=entity.grade,
            status=entity.status.value,
            issue_date=entity.issue_date,
            expiration_date=entity.expiration_date,
            renewal_date=entity.renewal_date,
            is_renewed=entity.is_renewed,
            image_url=image_url,
            technical_grade=entity.technical_grade.value,
            instructor_category=entity.instructor_category.value,
            age_category=entity.age_category.value,
            last_payment_id=entity.last_payment_id
        )

    @staticmethod
    def update_entity_from_dto(entity: License, dto: LicenseUpdate) -> License:
        """Update entity fields from Update DTO."""
        if dto.grade is not None:
            entity.update_grade(dto.grade)
        if dto.expiration_date is not None:
            entity.renew(dto.expiration_date)
        # Update category fields
        technical_grade = TechnicalGrade(dto.technical_grade) if dto.technical_grade else None
        instructor_category = InstructorCategory(dto.instructor_category) if dto.instructor_category else None
        age_category = AgeCategory(dto.age_category) if dto.age_category else None
        entity.update_categories(
            technical_grade=technical_grade,
            instructor_category=instructor_category,
            age_category=age_category
        )
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
