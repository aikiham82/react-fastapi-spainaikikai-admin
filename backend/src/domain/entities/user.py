from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class User:
    """User domain entity."""
    id: Optional[str] = None
    email: str = ""
    username: str = ""
    hashed_password: str = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the user entity."""
        if not self.email or not self.email.strip():
            raise ValueError("User email cannot be empty")
        if not self.username or not self.username.strip():
            raise ValueError("User username cannot be empty")
        if "@" not in self.email:
            raise ValueError("Invalid email format")

    def deactivate(self) -> None:
        """Deactivate the user."""
        self.is_active = False

    def activate(self) -> None:
        """Activate the user."""
        self.is_active = True

    def update_password(self, hashed_password: str) -> None:
        """Update user password."""
        if not hashed_password or not hashed_password.strip():
            raise ValueError("Password cannot be empty")
        self.hashed_password = hashed_password