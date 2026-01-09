"""Club DTOs for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ClubBase(BaseModel):
    """Base Club DTO."""
    name: str
    address: str
    city: str
    province: str
    postal_code: str
    country: str
    phone: str
    email: EmailStr
    association_id: Optional[str] = None


class ClubCreate(ClubBase):
    """DTO for creating a new club."""
    pass


class ClubUpdate(BaseModel):
    """DTO for updating a club."""
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    association_id: Optional[str] = None
    is_active: Optional[bool] = None


class ClubResponse(ClubBase):
    """DTO for club response."""
    id: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
