"""Invoice DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InvoiceLineItemResponse(BaseModel):
    """DTO for invoice line item response."""
    description: str
    quantity: int
    unit_price: float
    tax_rate: float

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """DTO for invoice response."""
    id: str
    invoice_number: str
    payment_id: str
    member_id: str
    club_id: Optional[str] = None
    license_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_tax_id: Optional[str] = None
    customer_email: Optional[str] = None
    line_items: List[InvoiceLineItemResponse]
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """DTO for invoice list response."""
    invoices: List[InvoiceResponse]
    total: int
