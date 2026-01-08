"""Seminar domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class SeminarNotFoundError(EntityNotFoundError):
    """Raised when a seminar is not found."""

    def __init__(self, seminar_id: str):
        super().__init__("Seminar", seminar_id)


class InvalidSeminarDataError(ValidationError):
    """Raised when seminar data is invalid."""
    pass


class SeminarAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a seminar that already exists."""
    pass


class CancelledSeminarError(BusinessRuleViolationError):
    """Raised when trying to perform operations on a cancelled seminar."""
    pass


class CompletedSeminarError(BusinessRuleViolationError):
    """Raised when trying to perform operations on a completed seminar."""
    pass


class SeminarIsFullError(BusinessRuleViolationError):
    """Raised when trying to add a participant to a full seminar."""
    pass


class InvalidSeminarDatesError(BusinessRuleViolationError):
    """Raised when seminar dates are invalid."""
    pass
