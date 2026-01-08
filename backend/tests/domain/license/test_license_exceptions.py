"""License exception tests."""

import pytest

from src.domain.exceptions.license import (
    LicenseNotFoundError,
    InvalidLicenseDataError,
    LicenseAlreadyExistsError,
    ExpiredLicenseError,
    InvalidLicenseRenewalError,
    LicenseAlreadyRenewedError
)


class TestLicenseExceptions:
    """Test cases for License domain exceptions."""

    def test_license_not_found_error(self):
        """Test LicenseNotFoundError."""
        error = LicenseNotFoundError("LIC-123")
        assert error.entity_type == "License"
        assert error.entity_id == "LIC-123"
        assert "not found" in str(error).lower()
        assert "LIC-123" in str(error)

    def test_invalid_license_data_error(self):
        """Test InvalidLicenseDataError."""
        error = InvalidLicenseDataError("Invalid license data")
        assert error.entity_type == "ValidationError"
        assert "Invalid license data" in str(error)

    def test_license_already_exists_error(self):
        """Test LicenseAlreadyExistsError."""
        error = LicenseAlreadyExistsError("License already exists")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "already exists" in str(error).lower()

    def test_expired_license_error(self):
        """Test ExpiredLicenseError."""
        error = ExpiredLicenseError("License is expired")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "expired" in str(error).lower()

    def test_invalid_license_renewal_error(self):
        """Test InvalidLicenseRenewalError."""
        error = InvalidLicenseRenewalError("Invalid license renewal")
        assert error.entity_type == "ValidationError"
        assert "Invalid license renewal" in str(error).lower()

    def test_license_already_renewed_error(self):
        """Test LicenseAlreadyRenewedError."""
        error = LicenseAlreadyRenewedError("License already renewed")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "already renewed" in str(error).lower()
