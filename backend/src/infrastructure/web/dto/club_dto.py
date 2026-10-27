"""Club DTOs for request/response validation."""

from pydantic import BaseModel
from typing import List, Optional
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
    email: Optional[str] = None
    website: Optional[str] = None


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
    email: Optional[str] = None
    website: Optional[str] = None


class ClubResponse(ClubBase):
    """DTO for club response."""
    id: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeregisteredClubResponse(BaseModel):
    """How many members and logins a deregistration switched off."""
    members: int
    accounts: int


class TransferClubAccountDTO(BaseModel):
    """DTO for passing the club's shared account onto a member."""
    account_id: str
    member_id: str


class ClubAccountCandidateResponse(BaseModel):
    """A shidoin or fukushidoin the club account could be passed to."""
    member_id: str
    name: str
    instructor_category: str


class ClubAccountSummaryResponse(BaseModel):
    """A club still signing in with a shared club account."""
    club_id: str
    club_name: str
    account_id: str
    username: str
    email: str
    candidates: List[ClubAccountCandidateResponse]
