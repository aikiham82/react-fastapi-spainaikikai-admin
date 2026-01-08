"""Insurance DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InsuranceBase(BaseModel):
    """Base Insurance DTO."""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    insurance_type: str = "accident"
    policy_number: str
    insurance_company: str
    coverage_amount: Optional[float] = None
    payment_id: Optional[str] = None


class InsuranceCreate(InsuranceBase):
    """DTO for creating a new insurance."""
    start_date: datetime
    end_date: datetime


class InsuranceUpdate(BaseModel):
    """DTO for updating an insurance."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    coverage_amount: Optional[float] = None
    status: Optional[str] = None


class InsuranceResponse(InsuranceBase):
    """DTO for insurance response."""
    id: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    documents: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
