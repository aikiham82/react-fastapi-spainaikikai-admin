"""Member DTOs for request/response validation."""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class MemberBase(BaseModel):
    """Base Member DTO."""
    first_name: str
    last_name: str
    dni: str
    email: EmailStr
    phone: str
    address: str
    city: str
    province: str
    postal_code: str
    country: str = "Spain"
    federation_number: str
    club_id: Optional[str] = None


class MemberCreate(MemberBase):
    """DTO for creating a new member."""
    birth_date: Optional[datetime] = None


class MemberUpdate(BaseModel):
    """DTO for updating a member."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    birth_date: Optional[datetime] = None
    federation_number: Optional[str] = None
    club_id: Optional[str] = None
    status: Optional[str] = None


class MemberResponse(MemberBase):
    """DTO for member response."""
    id: str
    birth_date: Optional[datetime] = None
    status: str
    registration_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
