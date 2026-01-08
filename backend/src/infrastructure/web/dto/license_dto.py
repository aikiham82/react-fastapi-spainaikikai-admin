"""License DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LicenseBase(BaseModel):
    """Base License DTO."""
    license_number: str
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    association_id: Optional[str] = None
    license_type: str = "kyu"
    grade: str


class LicenseCreate(LicenseBase):
    """DTO for creating a new license."""
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None


class LicenseUpdate(BaseModel):
    """DTO for updating a license."""
    grade: Optional[str] = None
    expiration_date: Optional[datetime] = None


class LicenseRenewRequest(BaseModel):
    """DTO for renewing a license."""
    expiration_date: datetime


class LicenseResponse(LicenseBase):
    """DTO for license response."""
    id: str
    status: str
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    is_renewed: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
