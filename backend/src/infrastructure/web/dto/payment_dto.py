"""Payment DTOs for request/response validation."""

from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class PaymentBase(BaseModel):
    """Base Payment DTO."""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    payment_type: str = "annual_quota"
    amount: float
    related_entity_id: Optional[str] = None


class PaymentCreate(PaymentBase):
    """DTO for creating a new payment."""
    pass


class PaymentResponse(PaymentBase):
    """DTO for payment response."""
    id: str
    status: str
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None
    redsys_response: Optional[str] = None
    error_message: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentRefundRequest(BaseModel):
    """DTO for refunding a payment."""
    refund_amount: Optional[float] = None


class RedsysPaymentRequest(BaseModel):
    """DTO for Redsys payment initiation."""
    payment_id: str
    return_url: HttpUrl


class RedsysWebhookResponse(BaseModel):
    """DTO for Redsys webhook response."""
    transaction_id: str
    status: str
    payment_id: Optional[str] = None
