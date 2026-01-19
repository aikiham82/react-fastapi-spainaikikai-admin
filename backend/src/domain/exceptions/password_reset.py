"""Password reset domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class PasswordResetTokenNotFoundError(EntityNotFoundError):
    """Raised when a password reset token is not found."""

    def __init__(self, token: str = "unknown"):
        # Use a generic identifier to avoid exposing token values in logs
        super().__init__("PasswordResetToken", "invalid_or_not_found")


class PasswordResetTokenExpiredError(BusinessRuleViolationError):
    """Raised when attempting to use an expired password reset token."""

    def __init__(self):
        super().__init__("El enlace de restablecimiento de contrasena ha expirado")


class PasswordResetTokenUsedError(BusinessRuleViolationError):
    """Raised when attempting to use a password reset token that has already been used."""

    def __init__(self):
        super().__init__("El enlace de restablecimiento de contrasena ya ha sido utilizado")


class InvalidPasswordResetTokenError(ValidationError):
    """Raised when a password reset token is invalid or malformed."""

    def __init__(self, message: str = "Token de restablecimiento de contrasena invalido"):
        super().__init__(message)


class PasswordResetRateLimitError(BusinessRuleViolationError):
    """Raised when too many password reset requests have been made."""

    def __init__(self):
        super().__init__("Demasiadas solicitudes de restablecimiento. Por favor, espera antes de intentar de nuevo")
