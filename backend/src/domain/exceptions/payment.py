"""Payment domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class PaymentNotFoundError(EntityNotFoundError):
    """Raised when a payment is not found."""

    def __init__(self, payment_id: str):
        super().__init__("Payment", payment_id)


class InvalidPaymentDataError(ValidationError):
    """Raised when payment data is invalid."""
    pass


class PaymentAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a payment that already exists."""
    pass


class InvalidPaymentStatusError(BusinessRuleViolationError):
    """Raised when trying to perform an operation with invalid payment status."""
    pass


class PaymentAlreadyCompletedError(BusinessRuleViolationError):
    """Raised when trying to complete a payment that is already completed."""
    pass


class PaymentNotRefundableError(BusinessRuleViolationError):
    """Raised when trying to refund a payment that is not refundable."""
    pass


class InvalidRefundAmountError(BusinessRuleViolationError):
    """Raised when trying to refund an invalid amount."""
    pass


class RedsysPaymentError(BusinessRuleViolationError):
    """Raised when a Redsys payment operation fails."""
    pass


class RedsysSignatureError(BusinessRuleViolationError):
    """Raised when Redsys signature verification fails."""

    def __init__(self, message: str = "Invalid Redsys signature"):
        super().__init__(message)


class RedsysEncryptionError(BusinessRuleViolationError):
    """Raised when Redsys encryption/decryption fails."""

    def __init__(self, message: str = "Redsys encryption error"):
        super().__init__(message)


class RedsysWebhookError(BusinessRuleViolationError):
    """Raised when processing Redsys webhook fails."""

    def __init__(self, message: str = "Redsys webhook processing error"):
        super().__init__(message)
