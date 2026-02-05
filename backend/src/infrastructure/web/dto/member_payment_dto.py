"""Member Payment DTOs for request/response validation."""

from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class MemberPaymentResponse(BaseModel):
    """DTO for member payment response.

    Note: club_id has been removed. The club can be derived from the member.
    """
    id: str
    payment_id: str
    member_id: str
    payment_year: int
    payment_type: str
    concept: str
    amount: float
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaymentTypeStatusResponse(BaseModel):
    """DTO for payment type status."""
    payment_type: str
    is_paid: bool
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None


class MemberPaymentStatusResponse(BaseModel):
    """DTO for member payment status response."""
    member_id: str
    member_name: str
    payment_year: int
    payment_statuses: List[PaymentTypeStatusResponse]
    total_paid: float
    has_all_licenses: bool
    has_all_insurances: bool


class MemberPaymentHistoryResponse(BaseModel):
    """DTO for member payment history response."""
    member_id: str
    member_name: str
    payments: List[MemberPaymentResponse]
    total_count: int


class PaymentTypeSummaryResponse(BaseModel):
    """DTO for payment type summary."""
    payment_type: str
    paid_count: int
    total_amount: float


class MemberPaymentSummaryResponse(BaseModel):
    """DTO for member payment summary in club view."""
    member_id: str
    member_name: str
    license_paid: bool
    insurance_paid: bool
    total_paid: float


class ClubPaymentSummaryResponse(BaseModel):
    """DTO for club payment summary response."""
    club_id: str
    club_name: str
    payment_year: int
    total_members: int
    members_with_license: int
    members_with_insurance: int
    total_collected: float
    by_payment_type: List[PaymentTypeSummaryResponse]
    members: List[MemberPaymentSummaryResponse]


class UnpaidMemberResponse(BaseModel):
    """DTO for unpaid member info."""
    member_id: str
    member_name: str
    email: str
    dni: str


class UnpaidMembersResponse(BaseModel):
    """DTO for unpaid members list response."""
    club_id: str
    payment_year: int
    payment_type: Optional[str] = None
    unpaid_members: List[UnpaidMemberResponse]
    total_count: int


# Request DTOs for member assignment in annual payments
class MemberPaymentAssignment(BaseModel):
    """DTO for assigning a payment to a specific member."""
    member_id: str
    member_name: str  # For display purposes
    payment_types: List[str]  # e.g., ["licencia_kyu", "seguro_accidentes"]

    @field_validator('member_id')
    @classmethod
    def validate_member_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Member ID is required')
        return v.strip()

    @field_validator('payment_types')
    @classmethod
    def validate_payment_types(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError('At least one payment type is required')
        valid_types = [
            'licencia_kyu', 'licencia_kyu_infantil', 'licencia_dan',
            'titulo_fukushidoin', 'titulo_shidoin',
            'seguro_accidentes', 'seguro_rc'
        ]
        for ptype in v:
            if ptype not in valid_types:
                raise ValueError(f'Invalid payment type: {ptype}')
        return v
