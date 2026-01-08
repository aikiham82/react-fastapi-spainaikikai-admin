"""License domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class LicenseNotFoundError(EntityNotFoundError):
    """Raised when a license is not found."""

    def __init__(self, license_id: str):
        super().__init__("License", license_id)


class InvalidLicenseDataError(ValidationError):
    """Raised when license data is invalid."""
    pass


class LicenseAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a license that already exists."""
    pass


class ExpiredLicenseError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an expired license."""
    pass


class RevokedLicenseError(BusinessRuleViolationError):
    """Raised when trying to perform operations on a revoked license."""
    pass


class InvalidLicenseRenewalError(BusinessRuleViolationError):
    """Raised when trying to renew a license with invalid parameters."""
    pass


class LicenseAlreadyRenewedError(BusinessRuleViolationError):
    """Raised when trying to renew a license that has already been renewed."""
    pass
