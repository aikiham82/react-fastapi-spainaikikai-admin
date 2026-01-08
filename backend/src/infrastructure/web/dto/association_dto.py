"""Association DTOs for request/response validation."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AssociationBase(BaseModel):
    """Base Association DTO."""
    name: str
    address: str
    city: str
    province: str
    postal_code: str
    country: str
    phone: str
    email: EmailStr
    cif: str


class AssociationCreate(AssociationBase):
    """DTO for creating a new association."""
    pass


class AssociationUpdate(BaseModel):
    """DTO for updating an association."""
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class AssociationResponse(AssociationBase):
    """DTO for association response."""
    id: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
