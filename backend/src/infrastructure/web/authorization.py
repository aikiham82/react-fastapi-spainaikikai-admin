"""Authorization helpers for role-based access control.

This module provides authorization utilities that work with the AuthContext
pattern where permissions are derived from:
- User.global_role: System-wide permissions (super_admin or user)
- Member.club_role: Club-level permissions (admin or member)
"""

from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, status

from src.domain.entities.user import User, GlobalRole
from src.domain.entities.member import Member, ClubRole


@dataclass
class AuthContext:
    """Authentication context containing user and linked member information.

    This class encapsulates the authentication state for a request, providing
    convenient properties to check permissions based on the new role system.
    """
    user: User
    member: Optional[Member] = None

    @property
    def is_super_admin(self) -> bool:
        """Check if user has super admin (system-wide) privileges."""
        return self.user.global_role == GlobalRole.SUPER_ADMIN

    @property
    def is_club_admin(self) -> bool:
        """Check if user is an admin of their associated club."""
        if self.member:
            return self.member.club_role == ClubRole.ADMIN
        return False

    @property
    def club_id(self) -> Optional[str]:
        """Get the user's club ID (via linked member)."""
        if self.member:
            return self.member.club_id
        return None

    @property
    def member_id(self) -> Optional[str]:
        """Get the linked member ID."""
        return self.user.member_id

    def has_club_access(self, target_club_id: str) -> bool:
        """Check if user has access to a specific club."""
        if self.is_super_admin:
            return True
        if self.club_id == target_club_id:
            return True
        return False


# ============================================================================
# New AuthContext-based functions
# ============================================================================

def check_club_access_ctx(ctx: AuthContext, club_id: str) -> None:
    """
    Verify user has access to the specified club using AuthContext.

    Super admins have access to all clubs.
    Club admins only have access to their own club.

    Args:
        ctx: The authentication context
        club_id: The club ID to check access for

    Raises:
        HTTPException: 403 Forbidden if access denied
    """
    if ctx.has_club_access(club_id):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied to club {club_id}"
    )


def get_club_filter_ctx(ctx: AuthContext) -> Optional[str]:
    """
    Get the club_id filter for list operations using AuthContext.

    Returns None for super admins (no filter - see all).
    Returns user's club_id for club admins/members.

    Args:
        ctx: The authentication context

    Returns:
        club_id to filter by, or None for no filter
    """
    if ctx.is_super_admin:
        return None  # No filter - see all clubs/members

    return ctx.club_id


def require_super_admin(ctx: AuthContext) -> None:
    """
    Require user to be super admin.

    Args:
        ctx: The authentication context

    Raises:
        HTTPException: 403 Forbidden if not super admin
    """
    if not ctx.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires super admin privileges"
        )


def require_club_admin_ctx(ctx: AuthContext) -> None:
    """
    Require user to be at least a club admin.

    Args:
        ctx: The authentication context

    Raises:
        HTTPException: 403 Forbidden if not at least club admin
    """
    if not ctx.is_super_admin and not ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires club admin privileges"
        )
