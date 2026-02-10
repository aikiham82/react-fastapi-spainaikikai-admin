"""Member DTOs for request/response validation."""

from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime


class MemberBase(BaseModel):
    """Base Member DTO."""
    first_name: str
    email: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Spain"
    club_id: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        """Allow empty strings and validate non-empty emails."""
        if v is None or v == '':
            return None
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v


class MemberCreate(MemberBase):
    """DTO for creating a new member."""
    birth_date: Optional[datetime] = None


class MemberUpdate(BaseModel):
    """DTO for updating a member."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    birth_date: Optional[datetime] = None
    club_id: Optional[str] = None
    status: Optional[str] = None
    club_role: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        """Allow empty strings and validate non-empty emails."""
        if v is None or v == '':
            return None
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v


class MemberStatusChange(BaseModel):
    """DTO for changing a member's status."""
    status: str

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        allowed = {'active', 'inactive'}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v


class LicenseSummary(BaseModel):
    """Summary of a member's primary license."""
    grade: Optional[str] = None
    technical_grade: Optional[str] = None
    instructor_category: Optional[str] = None
    status: Optional[str] = None
    expiration_date: Optional[datetime] = None


class InsuranceSummary(BaseModel):
    """Summary of a member's insurance status."""
    has_accident: bool = False
    accident_status: Optional[str] = None
    has_rc: bool = False
    rc_status: Optional[str] = None


class MemberResponse(MemberBase):
    """DTO for member response."""
    id: str
    birth_date: Optional[datetime] = None
    status: str
    club_role: str = "member"
    club_name: Optional[str] = None
    registration_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    license_summary: Optional[LicenseSummary] = None
    insurance_summary: Optional[InsuranceSummary] = None

    class Config:
        from_attributes = True
