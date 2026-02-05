"""Authorization helpers for role-based access control.

This module provides authorization utilities that work with the new AuthContext
pattern where permissions are derived from:
- User.global_role: System-wide permissions (super_admin or user)
- Member.club_role: Club-level permissions (admin or member)

Legacy support is maintained for backwards compatibility during transition.
"""

from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, status

from src.domain.entities.user import User, GlobalRole
from src.domain.entities.member import Member, ClubRole

# Legacy role constants (deprecated - kept for backwards compatibility)
ROLE_ASSOCIATION_ADMIN = "association_admin"
ROLE_CLUB_ADMIN = "club_admin"


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
        # Legacy fallback: check old role field
        return self.user.role == ROLE_CLUB_ADMIN

    @property
    def club_id(self) -> Optional[str]:
        """Get the user's club ID (via member or legacy field)."""
        if self.member:
            return self.member.club_id
        # Legacy fallback
        return self.user.club_id

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


# ============================================================================
# Legacy functions (deprecated - kept for backwards compatibility)
# ============================================================================

def is_association_admin(user: User) -> bool:
    """Check if user is an association admin (DEPRECATED).

    Use AuthContext.is_super_admin instead.
    """
    # Check new global_role first
    if user.global_role == GlobalRole.SUPER_ADMIN:
        return True
    # Legacy fallback
    return user.role == ROLE_ASSOCIATION_ADMIN


def is_club_admin(user: User) -> bool:
    """Check if user is a club admin (DEPRECATED).

    Use AuthContext.is_club_admin instead.
    Note: This legacy function can't check Member.club_role without the member.
    """
    return user.role == ROLE_CLUB_ADMIN


def check_club_access(user: User, club_id: str) -> None:
    """
    Verify user has access to the specified club (DEPRECATED).

    Use check_club_access_ctx with AuthContext instead.
    """
    if is_association_admin(user):
        return  # Super admins have full access

    if is_club_admin(user):
        if user.club_id == club_id:
            return  # Club admin accessing their own club
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to club {club_id}"
        )

    # Unknown role - deny access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions"
    )


def get_club_filter(user: User) -> Optional[str]:
    """
    Get the club_id filter for list operations (DEPRECATED).

    Use get_club_filter_ctx with AuthContext instead.
    """
    if is_association_admin(user):
        return None  # No filter - see all clubs/members

    if is_club_admin(user):
        return user.club_id

    # Unknown role - return impossible filter
    return "DENIED"


def require_association_admin(user: User) -> None:
    """
    Require user to be association admin (DEPRECATED).

    Use require_super_admin with AuthContext instead.
    """
    if not is_association_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires association admin privileges"
        )
