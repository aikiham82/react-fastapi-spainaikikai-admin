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
        assert error.entity_type == "License"
        assert error.entity_id == "LIC-123"
        assert "not found" in str(error).lower()
        assert "LIC-123" in str(error)

    def test_invalid_license_data_error(self):
        """Test InvalidLicenseDataError."""
        error = InvalidLicenseDataError("Invalid license data")

    def test_license_already_exists_error(self):
        """Test LicenseAlreadyExistsError."""
        error = LicenseAlreadyExistsError("License already exists")

    def test_expired_license_error(self):
        """Test ExpiredLicenseError."""
        error = ExpiredLicenseError("License is expired")

    def test_invalid_license_renewal_error(self):
        """Test InvalidLicenseRenewalError."""
        error = InvalidLicenseRenewalError("Invalid license renewal")

    def test_license_already_renewed_error(self):
        """Test LicenseAlreadyRenewedError."""
        error = LicenseAlreadyRenewedError("License already renewed")
