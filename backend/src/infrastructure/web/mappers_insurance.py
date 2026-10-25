"""Insurance mapper for DTO to Entity conversion."""

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
from src.infrastructure.web.dto.insurance_dto import (
    InsuranceCreate,
    InsuranceResponse
)


class InsuranceMapper:
    """Mapper for Insurance entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: InsuranceCreate) -> Insurance:
        """Convert Create DTO to Domain Entity."""
        return Insurance(
            member_id=dto.member_id,
            insurance_type=InsuranceType(dto.insurance_type),
            policy_number=dto.policy_number,
            insurance_company=dto.insurance_company,
            start_date=dto.start_date,
            end_date=dto.end_date,
            status=InsuranceStatus.ACTIVE,
            coverage_amount=dto.coverage_amount,
            payment_id=dto.payment_id
        )

    @staticmethod
    def to_response_dto(entity: Insurance) -> InsuranceResponse:
        """Convert Domain Entity to Response DTO."""
        return InsuranceResponse(
            id=entity.id,
            member_id=entity.member_id,
            insurance_type=entity.insurance_type.value,
            policy_number=entity.policy_number,
            insurance_company=entity.insurance_company,
            status=entity.effective_status.value,
            start_date=entity.start_date,
            end_date=entity.end_date,
            coverage_amount=entity.coverage_amount,
            payment_id=entity.payment_id,
            documents=entity.documents
        )

    @staticmethod
    def to_response_list(entities: list[Insurance]) -> list[InsuranceResponse]:
        """Convert list of entities to list of DTOs."""
        return [InsuranceMapper.to_response_dto(entity) for entity in entities]
