"""License DTOs for request/response validation."""

from pydantic import BaseModel, computed_field
from typing import Optional, List
from datetime import datetime
import re


class LicenseBase(BaseModel):
    """Base License DTO.

    Note: club_id has been removed. Club association is derived from the member.
    """
    license_number: str
    member_id: Optional[str] = None
    association_id: Optional[str] = None
    license_type: str = "kyu"
    grade: str


class LicenseCreate(BaseModel):
    """DTO for creating a new license - accepts frontend format.

    Note: club_id has been removed. Club association is derived from the member.
    """
    member_id: str
    license_number: Optional[str] = None
    association_id: Optional[str] = None
    license_type: str = "dan"
    grade: Optional[str] = None
    dan_grade: Optional[int] = None
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    # Category fields (English names)
    technical_grade: Optional[str] = None
    instructor_category: Optional[str] = None
    age_category: Optional[str] = None


class LicenseUpdate(BaseModel):
    """DTO for updating a license."""
    grade: Optional[str] = None
    expiration_date: Optional[datetime] = None
    # Category fields (English names)
    technical_grade: Optional[str] = None
    instructor_category: Optional[str] = None
    age_category: Optional[str] = None


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
    image_url: Optional[str] = None
    member_name: Optional[str] = None
    # Category fields (English names)
    technical_grade: str = "kyu"
    instructor_category: str = "none"
    age_category: str = "adulto"
    last_payment_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def expiry_date(self) -> Optional[datetime]:
        """Alias for expiration_date for frontend compatibility."""
        return self.expiration_date

    @computed_field
    @property
    def dan_grade(self) -> int:
        """Extract dan grade number from grade string."""
        if not self.grade:
            return 0
        # Try to extract number from patterns like "6 Dan", "6th Dan", "3rd Dan"
        match = re.search(r'(\d+)', self.grade)
        if match:
            return int(match.group(1))
        return 0

    class Config:
        from_attributes = True


class LicenseListResponse(BaseModel):
    """DTO for paginated license list response."""
    items: List[LicenseResponse]
    total: int
    offset: int
    limit: int
