from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class MemberStatus(str, Enum):
    """Member status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


@dataclass
class Member:
    """Member domain entity representing an Aikido practitioner."""
    id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    dni: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = "Spain"
    birth_date: Optional[datetime] = None
    federation_number: str = ""
    club_id: Optional[str] = None
    status: MemberStatus = MemberStatus.ACTIVE
    registration_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the member entity."""
        if not self.first_name or not self.first_name.strip():
            raise ValueError("Member first name cannot be empty")
        if not self.last_name or not self.last_name.strip():
            raise ValueError("Member last name cannot be empty")
        if not self.dni or not self.dni.strip():
            raise ValueError("Member DNI cannot be empty")
        if not self.email or not self.email.strip():
            raise ValueError("Member email cannot be empty")
        if "@" not in self.email:
            raise ValueError("Invalid email format")

    def get_full_name(self) -> str:
        """Get member full name."""
        return f"{self.first_name} {self.last_name}"

    def deactivate(self) -> None:
        """Deactivate member."""
        self.status = MemberStatus.INACTIVE

    def activate(self) -> None:
        """Activate member."""
        self.status = MemberStatus.ACTIVE

    def suspend(self) -> None:
        """Suspend member."""
        self.status = MemberStatus.SUSPENDED

    @property
    def is_active(self) -> bool:
        """Check if member is currently active."""
        return self.status == MemberStatus.ACTIVE

    def update_personal_info(
        self,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        postal_code: Optional[str] = None,
        country: Optional[str] = None
    ) -> None:
        """Update personal information."""
        if email and "@" not in email:
            raise ValueError("Invalid email format")
        if email:
            self.email = email
        if phone:
            self.phone = phone
        if address:
            self.address = address
        if city:
            self.city = city
        if province:
            self.province = province
        if postal_code:
            self.postal_code = postal_code
        if country:
            self.country = country

    def change_club(self, new_club_id: str) -> None:
        """Change member's club."""
        if not new_club_id:
            raise ValueError("Club ID cannot be empty")
        self.club_id = new_club_id
