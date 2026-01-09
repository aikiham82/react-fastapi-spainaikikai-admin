from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Association:
    """Association domain entity representing the Aikido federation."""
    id: Optional[str] = None
    name: str = ""
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = ""
    phone: str = ""
    email: str = ""
    cif: str = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the association entity."""
        if not self.name or not self.name.strip():
            raise ValueError("Association name cannot be empty")
        if not self.email or not self.email.strip():
            raise ValueError("Association email cannot be empty")
        if "@" not in self.email:
            raise ValueError("Invalid email format")
        if not self.cif or not self.cif.strip():
            raise ValueError("Association CIF cannot be empty")

    def deactivate(self) -> None:
        """Deactivate the association."""
        self.is_active = False

    def activate(self) -> None:
        """Activate the association."""
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
