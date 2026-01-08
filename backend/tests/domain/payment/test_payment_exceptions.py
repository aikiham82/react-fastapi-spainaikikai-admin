"""Payment exception tests."""

import pytest

from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    InvalidPaymentDataError,
    PaymentNotRefundableError,
    RedsysPaymentError
)


class TestPaymentExceptions:
    """Test cases for Payment domain exceptions."""

    def test_payment_not_found_error_str(self):
        """Test PaymentNotFoundError string representation."""
        error = PaymentNotFoundError("payment-123")
        error_str = str(error)
        
        assert error.entity_type == "Payment"
        assert "payment-123" in error_str
        assert "not found" in error_str.lower()

    def test_payment_not_found_error_type(self):
        """Test PaymentNotFoundError entity type."""
        error = PaymentNotFoundError("payment-123")
        assert error.entity_type == "Payment"

    def test_payment_not_found_error_id(self):
        """Test PaymentNotFoundError entity_id."""
        error = PaymentNotFoundError("payment-123")
        assert error.entity_id == "payment-123"

    def test_invalid_payment_data_error(self):
        """Test InvalidPaymentDataError."""
        error = InvalidPaymentDataError("Invalid payment data")
        assert error.entity_type == "ValidationError"
        assert "invalid payment data" in str(error).lower()

    def test_payment_not_refundable_error(self):
        """Test PaymentNotRefundableError."""
        error = PaymentNotRefundableError("Payment not refundable")
        assert "not refundable" in str(error).lower()

    def test_redsys_payment_error(self):
        """Test RedsysPaymentError."""
        error = RedsysPaymentError("Redsys payment failed")
        assert "Redsys payment" in str(error).lower()
        assert "payment" in str(error).lower()
