"""Insurance DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.domain.entities.insurance import InsuranceType
from src.infrastructure.web.dto.naive_datetime import NaiveDatetime


class InsuranceBase(BaseModel):
    """Base Insurance DTO.

    Note: club_id has been removed. The club is derived from the member.
    """
    member_id: Optional[str] = None
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
    insurance_type: Optional[InsuranceType] = None
    insurance_company: Optional[str] = None
    policy_number: Optional[str] = None
    start_date: Optional[NaiveDatetime] = None
    end_date: Optional[NaiveDatetime] = None
    coverage_amount: Optional[float] = None
    annulled: Optional[bool] = None


class InsuranceResponse(InsuranceBase):
    """DTO for insurance response."""
    id: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    documents: Optional[str] = None
    member_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InsuranceListResponse(BaseModel):
    """DTO for paginated insurance list response."""
    items: list[InsuranceResponse]
    total: int
    offset: int
    limit: int
