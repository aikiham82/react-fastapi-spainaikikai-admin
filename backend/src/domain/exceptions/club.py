"""Club domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class ClubNotFoundError(EntityNotFoundError):
    """Raised when a club is not found."""

    def __init__(self, club_id: str):
        super().__init__("Club", club_id)


class InvalidClubDataError(ValidationError):
    """Raised when club data is invalid."""
    pass


class ClubAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a club that already exists."""
    pass


class InactiveClubError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive club."""
    pass


class ClubHasActiveMembersError(BusinessRuleViolationError):
    """Raised when trying to deactivate a club with active members."""
    pass
