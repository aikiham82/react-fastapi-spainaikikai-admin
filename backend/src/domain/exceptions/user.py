"""User domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class UserNotFoundError(EntityNotFoundError):
    """Raised when a user is not found."""
    
    def __init__(self, user_id: str):
        super().__init__("User", user_id)


class InvalidUserDataError(ValidationError):
    """Raised when user data is invalid."""
    pass


class UserAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a user that already exists."""
    pass


class InactiveUserError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive user."""
    pass


class SuperAdminAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a second super admin (only one allowed)."""

    def __init__(self):
        super().__init__("Only one super admin is allowed in the system")