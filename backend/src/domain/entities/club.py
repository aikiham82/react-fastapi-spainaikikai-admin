from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Club:
    """Club domain entity representing an Aikido club."""
    id: Optional[str] = None
    name: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = ""
    phone: str = ""
    email: str = ""
    federation_number: str = ""
    association_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate the club entity."""
        if not self.name or not self.name.strip():
            raise ValueError("Club name cannot be empty")
        if not self.email or not self.email.strip():
            raise ValueError("Club email cannot be empty")
        if "@" not in self.email:
            raise ValueError("Invalid email format")
        if not self.federation_number or not self.federation_number.strip():
            raise ValueError("Federation number cannot be empty")

    def deactivate(self) -> None:
        """Deactivate the club."""
        self.is_active = False

    def activate(self) -> None:
        """Activate the club."""
        self.is_active = True

    def update_contact_info(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None
    ) -> None:
        """Update contact information."""
        if email and "@" not in email:
            raise ValueError("Invalid email format")
        if phone:
            self.phone = phone
        if email:
            self.email = email

    def update_address(
        self,
        address: str,
        city: str,
        province: str,
        postal_code: str,
        country: str
    ) -> None:
        """Update address information."""
        self.address = address
        self.city = city
        self.province = province
        self.postal_code = postal_code
        self.country = country
