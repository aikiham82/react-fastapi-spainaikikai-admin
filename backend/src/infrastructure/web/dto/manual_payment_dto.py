"""DTOs for manual payment registration and updates."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from src.infrastructure.web.dto.payment_dto import PaymentResponse

from src.infrastructure.web.dto.money import Money
from src.infrastructure.web.dto.payment_lines import (
    MAX_MEMBERS_PER_PAYMENT,
    refuse_repeated_members_or_too_many_lines,
    refuse_repeated_types,
)


class ManualMemberAssignmentDTO(BaseModel):
    """Assignment of payment types to a member (manual payment)."""

    member_id: str
    member_name: str
    payment_types: List[str]

    @field_validator("member_id")
    @classmethod
    def validate_member_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Member ID is required")
        return v.strip()

    @field_validator("payment_types")
    @classmethod
    def validate_payment_types(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one payment type required")
        valid_types = {
            "kyu", "kyu_infantil", "dan", "fukushidoin", "shidoin",
            "seguro_accidentes", "seguro_rc", "club_fee",
        }
        for pt in v:
            if pt not in valid_types:
                raise ValueError(f"Invalid payment type: {pt}")
        return refuse_repeated_types(v)


class ManualPaymentRequest(BaseModel):
    """Request DTO for POST /payments/manual."""

    payer_name: str
    club_id: str
    payment_year: int
    payment_method: str  # must be "cash" | "transfer" | "other"
    member_assignments: List[ManualMemberAssignmentDTO] = Field(max_length=MAX_MEMBERS_PER_PAYMENT)
    include_club_fee: bool = False

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        allowed = {"cash", "transfer", "other"}
        if v not in allowed:
            raise ValueError(f"payment_method must be one of {allowed}")
        return v

    @field_validator("payment_year")
    @classmethod
    def validate_payment_year(cls, v: int) -> int:
        if v < 1900 or v > 2100:
            raise ValueError("payment_year must be between 1900 and 2100")
        return v

    @field_validator("payer_name")
    @classmethod
    def validate_payer_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("payer_name is required")
        return v.strip()

    @field_validator("member_assignments")
    @classmethod
    def validate_member_assignments(cls, v: List[ManualMemberAssignmentDTO]) -> List[ManualMemberAssignmentDTO]:
        if not v:
            raise ValueError("At least one member assignment is required")
        return refuse_repeated_members_or_too_many_lines(v)


class PaymentUpdateRequest(BaseModel):
    """Request DTO for PUT /payments/{id}."""

    amount: Optional[Money] = None
    payment_year: Optional[int] = None
    payment_method: Optional[Literal["cash", "transfer", "other"]] = None
    payer_name: Optional[str] = None
    status: Optional[str] = None


class ConfirmPaymentRequest(BaseModel):
    """Request DTO for POST /payments/{id}/confirm."""

    payment_method: Literal["cash", "transfer", "other"]


class ManualPaymentResponse(BaseModel):
    """Response DTO for POST /payments/manual."""

    payment: PaymentResponse
    member_payment_count: int
    invoice_number: Optional[str] = None
