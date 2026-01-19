"""Price configuration domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class PriceConfigurationNotFoundError(EntityNotFoundError):
    """Raised when a price configuration is not found."""

    def __init__(self, price_id: str = None, key: str = None):
        if key:
            super().__init__("PriceConfiguration", f"key:{key}")
        else:
            super().__init__("PriceConfiguration", price_id)


class InvalidPriceConfigurationDataError(ValidationError):
    """Raised when price configuration data is invalid."""
    pass


class PriceConfigurationAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a price configuration that already exists."""

    def __init__(self, key: str):
        super().__init__(f"Price configuration with key '{key}' already exists")


class PriceConfigurationNotActiveError(BusinessRuleViolationError):
    """Raised when trying to use an inactive price configuration."""

    def __init__(self, key: str):
        super().__init__(f"Price configuration '{key}' is not active")


class PriceNotFoundError(BusinessRuleViolationError):
    """Raised when no price is configured for a license type combination."""

    def __init__(self, grado_tecnico: str, categoria_instructor: str, categoria_edad: str):
        key = f"{grado_tecnico}-{categoria_instructor}-{categoria_edad}"
        super().__init__(f"No price configured for license type: {key}")
