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
