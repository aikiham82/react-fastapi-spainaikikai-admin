"""Association domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class AssociationNotFoundError(EntityNotFoundError):
    """Raised when an association is not found."""

    def __init__(self, association_id: str):
        super().__init__("Association", association_id)


class InvalidAssociationDataError(ValidationError):
    """Raised when association data is invalid."""
    pass


class AssociationAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create an association that already exists."""
    pass


class InactiveAssociationError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive association."""
    pass
