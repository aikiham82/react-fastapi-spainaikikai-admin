from dataclasses import dataclass
from datetime import datetime, date
from typing import Optional
from enum import Enum


class LicenseStatus(str, Enum):
    """License status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    REVOKED = "revoked"


class LicenseType(str, Enum):
    """License type enumeration."""
    DAN = "dan"
    KYU = "kyu"
    INSTRUCTOR = "instructor"


@dataclass
class License:
    """License domain entity representing a federation license."""
    id: Optional[str] = None
    license_number: str = ""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    association_id: Optional[str] = None
    license_type: LicenseType = LicenseType.KYU
    grade: str = ""
    status: LicenseStatus = LicenseStatus.ACTIVE
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    is_renewed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate the license entity."""
        if not self.license_number or not self.license_number.strip():
            raise ValueError("License number cannot be empty")
        if not self.grade or not self.grade.strip():
            raise ValueError("Grade cannot be empty")

    def renew(self, new_expiration_date: datetime) -> None:
        """Renew the license."""
        if not new_expiration_date:
            raise ValueError("Expiration date cannot be empty")
        if new_expiration_date <= datetime.now():
            raise ValueError("Expiration date must be in the future")

        self.expiration_date = new_expiration_date
        self.renewal_date = datetime.now()
        self.is_renewed = True
        self.status = LicenseStatus.ACTIVE

    def revoke(self) -> None:
        """Revoke the license."""
        self.status = LicenseStatus.REVOKED

    def is_expired(self) -> bool:
        """Check if the license is expired."""
        if self.expiration_date:
            return datetime.now() > self.expiration_date
        return False

    def check_and_update_status(self) -> None:
        """Check and update license status based on expiration date."""
        if self.is_expired() and self.status == LicenseStatus.ACTIVE:
            self.status = LicenseStatus.EXPIRED

    def update_grade(self, new_grade: str) -> None:
        """Update the license grade."""
        if not new_grade or not new_grade.strip():
            raise ValueError("Grade cannot be empty")
        self.grade = new_grade
