from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class GlobalRole(str, Enum):
    """Global role enumeration for system-wide permissions."""
    USER = "user"  # Regular user (permissions via Member.club_role)
    SUPER_ADMIN = "super_admin"  # System-wide administrator


@dataclass
class User:
    """User domain entity.

    Note: club_id has been removed. Club association is now derived via member_id.
    The role field is deprecated - use global_role and Member.club_role instead.
    """
    id: Optional[str] = None
    email: str = ""
    username: str = ""
    hashed_password: str = ""
    is_active: bool = True
    global_role: GlobalRole = GlobalRole.USER  # System-wide role
    member_id: Optional[str] = None  # Link to Member entity
    # Legacy field - kept for backwards compatibility during transition
    role: Optional[str] = None  # Deprecated: use global_role + Member.club_role
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

    @property
    def is_super_admin(self) -> bool:
        """Check if user has super admin role."""
        return self.global_role == GlobalRole.SUPER_ADMIN

    def link_to_member(self, member_id: str) -> None:
        """Link this user to a member entity."""
        if not member_id or not member_id.strip():
            raise ValueError("Member ID cannot be empty")
        self.member_id = member_id
        self.updated_at = datetime.now()

    def unlink_from_member(self) -> None:
        """Remove the link to member entity."""
        self.member_id = None
        self.updated_at = datetime.now()

    def promote_to_super_admin(self) -> None:
        """Promote user to super admin role."""
        self.global_role = GlobalRole.SUPER_ADMIN
        self.updated_at = datetime.now()

    def demote_from_super_admin(self) -> None:
        """Demote user from super admin to regular user."""
        self.global_role = GlobalRole.USER
        self.updated_at = datetime.now()