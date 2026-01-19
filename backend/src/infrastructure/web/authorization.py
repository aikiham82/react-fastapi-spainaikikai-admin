"""Authorization helpers for role-based access control."""

from typing import Optional

from fastapi import HTTPException, status

from src.domain.entities.user import User

# Role constants
ROLE_ASSOCIATION_ADMIN = "association_admin"
ROLE_CLUB_ADMIN = "club_admin"


def is_association_admin(user: User) -> bool:
    """Check if user is an association admin."""
    return user.role == ROLE_ASSOCIATION_ADMIN


def is_club_admin(user: User) -> bool:
    """Check if user is a club admin."""
    return user.role == ROLE_CLUB_ADMIN


def check_club_access(user: User, club_id: str) -> None:
    """
    Verify user has access to the specified club.

    Association admins have access to all clubs.
    Club admins only have access to their own club.

    Args:
        user: The current authenticated user
        club_id: The club ID to check access for

    Raises:
        HTTPException: 403 Forbidden if access denied
    """
    if is_association_admin(user):
        return  # Association admins have full access

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
    Get the club_id filter for list operations.

    Returns None for association admins (no filter - see all).
    Returns user's club_id for club admins.

    Args:
        user: The current authenticated user

    Returns:
        club_id to filter by, or None for no filter
    """
    if is_association_admin(user):
        return None  # No filter - see all clubs/members

    if is_club_admin(user):
        return user.club_id

    # Unknown role - return impossible filter
    return "DENIED"


def require_association_admin(user: User) -> None:
    """
    Require user to be association admin.

    Args:
        user: The current authenticated user

    Raises:
        HTTPException: 403 Forbidden if not association admin
    """
    if not is_association_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires association admin privileges"
        )
