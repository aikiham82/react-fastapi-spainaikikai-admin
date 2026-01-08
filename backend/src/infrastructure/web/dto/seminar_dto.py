"""Seminar DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SeminarBase(BaseModel):
    """Base Seminar DTO."""
    title: str
    description: str = ""
    instructor_name: str
    venue: str
    address: str
    city: str
    province: str
    price: float = 0.0
    max_participants: Optional[int] = None
    club_id: Optional[str] = None
    association_id: Optional[str] = None


class SeminarCreate(SeminarBase):
    """DTO for creating a new seminar."""
    start_date: datetime
    end_date: datetime


class SeminarUpdate(BaseModel):
    """DTO for updating a seminar."""
    title: Optional[str] = None
    description: Optional[str] = None
    instructor_name: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    price: Optional[float] = None
    max_participants: Optional[int] = None


class SeminarResponse(SeminarBase):
    """DTO for seminar response."""
    id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    current_participants: int
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
