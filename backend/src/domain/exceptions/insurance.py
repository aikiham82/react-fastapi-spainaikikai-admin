"""Insurance domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class InsuranceNotFoundError(EntityNotFoundError):
    """Raised when an insurance is not found."""

    def __init__(self, insurance_id: str):
        super().__init__("Insurance", insurance_id)


class InvalidInsuranceDataError(ValidationError):
    """Raised when insurance data is invalid."""
    pass


class InsuranceAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create an insurance that already exists."""
    pass


class ExpiredInsuranceError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an expired insurance."""
    pass


class CancelledInsuranceError(BusinessRuleViolationError):
    """Raised when trying to perform operations on a cancelled insurance."""
    pass


class InvalidInsuranceDatesError(BusinessRuleViolationError):
    """Raised when insurance dates are invalid."""
    pass


class InsuranceNotActiveError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive insurance."""
    pass
