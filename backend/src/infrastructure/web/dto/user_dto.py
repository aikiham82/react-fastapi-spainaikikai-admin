"""User DTOs for web layer."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserBase(BaseModel):
    """Base user DTO."""
    email: EmailStr
    username: str
    is_active: bool = True
    role: Optional[str] = None
    club_id: Optional[str] = None


class UserCreate(BaseModel):
    """DTO for creating a user."""
    email: EmailStr
    username: str
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """DTO for updating a user."""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """DTO for user response."""
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """DTO for user login."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class Token(BaseModel):
    """DTO for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """DTO for token data."""
    username: Optional[str] = None