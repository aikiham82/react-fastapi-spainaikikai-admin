"""License entity tests."""

import pytest
from datetime import datetime, timedelta

from src.domain.entities.license import License, LicenseStatus, LicenseType
from src.domain.exceptions.license import (
    LicenseNotFoundError,
    ExpiredLicenseError,
    InvalidLicenseRenewalError,
    LicenseAlreadyRenewedError
)


class TestLicenseEntity:
    """Test cases for License domain entity."""

    def test_license_creation_valid(self):
        """Test valid license creation."""
        issue_date = datetime.now()
        expiration_date = issue_date + timedelta(days=365)

        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            issue_date=issue_date,
            expiration_date=expiration_date
        )

        assert license.license_number == "LIC-2024-001"
        assert license.member_id == "member-id"
        assert license.license_type == LicenseType.KYU
        assert license.grade == "5th Kyu"
        assert license.status == LicenseStatus.ACTIVE
        assert license.is_renewed is False

    def test_license_creation_empty_license_number(self):
        """Test license creation with empty license number raises error."""
        with pytest.raises(ValueError, match="License number cannot be empty"):
            License(
                license_number="",
                member_id="member-id",
                club_id="club-id",
                license_type=LicenseType.KYU,
                grade="5th Kyu"
            )

    def test_license_creation_empty_grade(self):
        """Test license creation with empty grade raises error."""
        with pytest.raises(ValueError, match="Grade cannot be empty"):
            License(
                license_number="LIC-2024-001",
                member_id="member-id",
                club_id="club-id",
                license_type=LicenseType.KYU,
                grade=""
            )

    def test_license_activation(self):
        """Test license activation."""
        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.PENDING,  # Use PENDING instead of INACTIVE
            expiration_date=datetime.now() + timedelta(days=365)
        )

        license.activate()
        assert license.status == LicenseStatus.ACTIVE

    def test_license_deactivation(self):
        """Test license deactivation."""
        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=datetime.now() + timedelta(days=365)
        )

        license.deactivate()
        assert license.status == LicenseStatus.EXPIRED  # deactivate sets to EXPIRED

    def test_license_expiration_check(self):
        """Test license expiration check."""
        # Expired license
        expired_date = datetime.now() - timedelta(days=1)
        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=expired_date
        )

        assert license.is_expired() is True

        # Not expired license
        future_date = datetime.now() + timedelta(days=365)
        license2 = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=future_date
        )

        assert license2.is_expired() is False

    def test_license_renewal(self):
        """Test license renewal."""
        future_date = datetime.now() + timedelta(days=365)

        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=datetime.now() - timedelta(days=30),
            is_renewed=False
        )

        license.renew(future_date)

        assert license.is_renewed is True
        assert license.expiration_date == future_date
        assert license.renewal_date is not None
        assert license.status == LicenseStatus.ACTIVE

    def test_license_renewal_with_valid_date(self):
        """Test license renewal with valid future date succeeds."""
        future_date = datetime.now() + timedelta(days=365)

        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=datetime.now() + timedelta(days=30)
        )

        license.renew(future_date)
        assert license.expiration_date == future_date
        assert license.is_renewed is True

    def test_license_renewal_past_date(self):
        """Test license renewal with past date raises error."""
        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=datetime.now() + timedelta(days=365)
        )

        with pytest.raises(ValueError, match="Expiration date must be in the future"):
            license.renew(datetime.now() - timedelta(days=1))

    def test_license_can_be_renewed_multiple_times(self):
        """Test that license can be renewed multiple times (updates is_renewed flag)."""
        future_date = datetime.now() + timedelta(days=365)

        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            expiration_date=future_date,
            is_renewed=True  # Already renewed
        )

        # renew() method doesn't check if already renewed - it just sets is_renewed = True
        new_date = future_date + timedelta(days=365)
        license.renew(new_date)
        assert license.expiration_date == new_date
        assert license.is_renewed is True

    def test_license_grade_update(self):
        """Test license grade update."""
        license = License(
            license_number="LIC-2024-001",
            member_id="member-id",
            club_id="club-id",
            association_id="association-id",
            license_type=LicenseType.KYU,
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE
        )

        license.update_grade("6th Kyu")
        assert license.grade == "6th Kyu"
