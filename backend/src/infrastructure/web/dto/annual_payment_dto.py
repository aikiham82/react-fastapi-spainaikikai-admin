"""Annual Payment DTOs for request/response validation."""

from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

# Maximum quantity per item type
MAX_QUANTITY_PER_ITEM = 200


class AnnualPaymentLineItem(BaseModel):
    """Line item for annual payment."""
    item_type: str
    description: str
    quantity: int
    unit_price: float
    total: float


class MemberPaymentAssignment(BaseModel):
    """Assignment of payment types to a specific member."""
    member_id: str
    member_name: str  # For display purposes
    payment_types: List[str]  # e.g., ["kyu", "seguro_accidentes"]

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
            'kyu', 'kyu_infantil', 'dan', 'fukushidoin', 'shidoin',
            'seguro_accidentes', 'seguro_rc'
        ]
        for ptype in v:
            if ptype not in valid_types:
                raise ValueError(f'Invalid payment type: {ptype}')
        return v


class InitiateAnnualPaymentRequest(BaseModel):
    """DTO for initiating an annual payment."""
    payer_name: str
    club_id: str
    payment_year: int
    include_club_fee: bool = False
    kyu_count: int = 0
    kyu_infantil_count: int = 0
    dan_count: int = 0
    fukushidoin_count: int = 0
    shidoin_count: int = 0
    seguro_accidentes_count: int = 0
    seguro_rc_count: int = 0
    member_assignments: Optional[List[MemberPaymentAssignment]] = None

    @field_validator('payment_year')
    @classmethod
    def validate_payment_year(cls, v: int) -> int:
        current_year = datetime.now().year
        if v < current_year - 1 or v > current_year + 1:
            raise ValueError(f'Payment year must be between {current_year - 1} and {current_year + 1}')
        return v

    @field_validator('payer_name')
    @classmethod
    def validate_payer_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Payer name is required')
        return v.strip()

    @field_validator('kyu_count', 'kyu_infantil_count', 'dan_count',
                     'fukushidoin_count', 'shidoin_count', 'seguro_accidentes_count', 'seguro_rc_count')
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        if v > MAX_QUANTITY_PER_ITEM:
            raise ValueError(f'Maximum {MAX_QUANTITY_PER_ITEM} items per type allowed')
        return v


class InitiateAnnualPaymentResponse(BaseModel):
    """DTO for annual payment initiation response."""
    payment_id: str
    order_id: str
    total_amount: float
    line_items: List[AnnualPaymentLineItem]
    payment_url: str
    ds_signature_version: str
    ds_merchant_parameters: str
    ds_signature: str


class PrefillMemberAssignment(BaseModel):
    """Pre-computed member assignment for prefill."""
    member_id: str
    member_name: str
    payment_types: List[str]


class PrefillAnnualPaymentResponse(BaseModel):
    """Response for annual payment prefill data."""
    payer_name: str = ""
    include_club_fee: bool = False
    kyu_count: int = 0
    kyu_infantil_count: int = 0
    dan_count: int = 0
    fukushidoin_count: int = 0
    shidoin_count: int = 0
    seguro_accidentes_count: int = 0
    seguro_rc_count: int = 0
    member_assignments: List[PrefillMemberAssignment] = []
    source: str = "members"  # "members" or "previous_payment"
