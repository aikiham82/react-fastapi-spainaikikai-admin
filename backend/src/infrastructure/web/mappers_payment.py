"""Payment mapper for DTO to Entity conversion."""

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.infrastructure.web.dto.payment_dto import (
    PaymentCreate,
    PaymentRefundRequest,
    PaymentResponse
)


class PaymentMapper:
    """Mapper for Payment entity and DTOs."""

    @staticmethod
    def from_create_dto(dto: PaymentCreate) -> Payment:
        """Convert Create DTO to Domain Entity."""
        return Payment(
            member_id=dto.member_id,
            club_id=dto.club_id,
            payment_type=PaymentType(dto.payment_type),
            amount=dto.amount,
            status=PaymentStatus.PENDING,
            related_entity_id=dto.related_entity_id
        )

    @staticmethod
    def to_response_dto(entity: Payment) -> PaymentResponse:
        """Convert Domain Entity to Response DTO."""
        return PaymentResponse(
            id=entity.id,
            member_id=entity.member_id,
            club_id=entity.club_id,
            payment_type=entity.payment_type.value,
            amount=entity.amount,
            status=entity.status.value,
            payment_date=entity.payment_date,
            transaction_id=entity.transaction_id,
            redsys_response=entity.redsys_response,
            error_message=entity.error_message,
            refund_amount=entity.refund_amount,
            refund_date=entity.refund_date,
            related_entity_id=entity.related_entity_id
        )

    @staticmethod
    def refund_from_dto(entity: Payment, dto: PaymentRefundRequest) -> Payment:
        """Refund payment entity from DTO."""
        entity.refund_payment(dto.refund_amount)
        return entity

    @staticmethod
    def to_response_list(entities: list[Payment]) -> list[PaymentResponse]:
        """Convert list of entities to list of DTOs."""
        return [PaymentMapper.to_response_dto(entity) for entity in entities]
