"""Payment mapper for DTO to Entity conversion."""

import json
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.infrastructure.web.dto.payment_dto import (
    PaymentCreate,
    PaymentRefundRequest,
    PaymentResponse
)


def exam_concept(entity: Payment) -> Optional[str]:
    if entity.payment_type != PaymentType.EXAM_FEE:
        return None
    lines = json.loads(entity.line_items_data or "[]")
    members = json.loads(entity.member_assignments or "[]")
    parts = [members[0].get("member_name") if members else None, lines[0].get("description") if lines else None]
    return " · ".join(part for part in parts if part) or None


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
            related_entity_id=dto.related_entity_id,
            payment_year=dto.payment_year
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
            payment_method=entity.payment_method.value,
            payment_date=entity.payment_date,
            transaction_id=entity.transaction_id,
            redsys_response=entity.redsys_response,
            error_message=entity.error_message,
            refund_amount=entity.refund_amount,
            refund_date=entity.refund_date,
            related_entity_id=entity.related_entity_id,
            payment_year=entity.payment_year,
            payer_name=entity.payer_name,
            concept=exam_concept(entity),
            created_at=entity.created_at,
            updated_at=entity.updated_at,
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
