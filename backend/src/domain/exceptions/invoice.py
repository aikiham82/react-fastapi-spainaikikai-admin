"""Invoice domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class InvoiceNotFoundError(EntityNotFoundError):
    """Raised when an invoice is not found."""

    def __init__(self, invoice_id: str = None, invoice_number: str = None):
        if invoice_number:
            super().__init__("Invoice", f"number:{invoice_number}")
        else:
            super().__init__("Invoice", invoice_id)


class InvalidInvoiceDataError(ValidationError):
    """Raised when invoice data is invalid."""
    pass


class InvoiceAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create an invoice that already exists."""

    def __init__(self, invoice_number: str):
        super().__init__(f"Invoice with number '{invoice_number}' already exists")


class InvoiceAlreadyIssuedError(BusinessRuleViolationError):
    """Raised when trying to modify an already issued invoice."""

    def __init__(self, invoice_number: str):
        super().__init__(f"Invoice '{invoice_number}' has already been issued")


class InvoiceCancelledError(BusinessRuleViolationError):
    """Raised when trying to operate on a cancelled invoice."""

    def __init__(self, invoice_number: str):
        super().__init__(f"Invoice '{invoice_number}' has been cancelled")


class InvoicePDFGenerationError(BusinessRuleViolationError):
    """Raised when PDF generation fails."""

    def __init__(self, invoice_number: str, reason: str = "Unknown error"):
        super().__init__(f"Failed to generate PDF for invoice '{invoice_number}': {reason}")
