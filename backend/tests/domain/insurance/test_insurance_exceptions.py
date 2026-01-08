"""Insurance exception tests."""

import pytest

from src.domain.exceptions.insurance import (
    InsuranceNotFoundError,
    InvalidInsuranceDataError,
    InsuranceAlreadyExistsError,
    ExpiredInsuranceError,
    InvalidInsuranceDatesError,
    InsuranceNotActiveError
)


class TestInsuranceExceptions:
    """Test cases for Insurance domain exceptions."""

    def test_insurance_not_found_error(self):
        """Test InsuranceNotFoundError."""
        error = InsuranceNotFoundError("insurance-123")
        assert error.entity_type == "Insurance"
        assert "not found" in str(error).lower()
        assert "insurance-123" in str(error)

    def test_invalid_insurance_data_error(self):
        """Test InvalidInsuranceDataError."""
        error = InvalidInsuranceDataError("Invalid insurance data")
        assert error.entity_type == "ValidationError"
        assert "invalid insurance data" in str(error).lower()

    def test_insurance_already_exists_error(self):
        """Test InsuranceAlreadyExistsError."""
        error = InsuranceAlreadyExistsError("Insurance already exists")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "already exists" in str(error).lower()

    def test_expired_insurance_error(self):
        """Test ExpiredInsuranceError."""
        error = ExpiredInsuranceError("Insurance is expired")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "is expired" in str(error).lower()

    def test_invalid_insurance_dates_error(self):
        """Test InvalidInsuranceDatesError."""
        error = InvalidInsuranceDatesError("Invalid insurance dates")
        assert error.entity_type == "Insurance"
        assert "invalid insurance dates" in str(error).lower()

    def test_insurance_not_active_error(self):
        """Test InsuranceNotActiveError."""
        error = InsuranceNotActiveError("Insurance not active")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "not active" in str(error).lower()
