"""Payment DTOs for request/response validation."""

from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime


class PaymentBase(BaseModel):
    """Base Payment DTO."""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    payment_type: str = "license_fee"
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
    redsys_response: Optional[Dict[str, Any]] = None
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


class InitiatePaymentRequest(BaseModel):
    """DTO for initiating a Redsys payment."""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    payment_type: str = "license_fee"
    amount: float
    related_entity_id: Optional[str] = None
    description: Optional[str] = None


class InitiatePaymentResponse(BaseModel):
    """DTO for Redsys payment initiation response."""
    payment_id: str
    order_id: str
    payment_url: str
    ds_signature_version: str
    ds_merchant_parameters: str
    ds_signature: str


class RedsysWebhookRequest(BaseModel):
    """DTO for Redsys webhook notification."""
    Ds_SignatureVersion: str
    Ds_MerchantParameters: str
    Ds_Signature: str


class RedsysWebhookResponse(BaseModel):
    """DTO for Redsys webhook response."""
    success: bool
    message: str
    payment_id: Optional[str] = None
    invoice_number: Optional[str] = None


# Keep for backward compatibility
class RedsysPaymentRequest(BaseModel):
    """DTO for Redsys payment initiation (legacy)."""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    payment_type: str = "license_fee"
    amount: float
    return_url: HttpUrl
    related_entity_id: Optional[str] = None
