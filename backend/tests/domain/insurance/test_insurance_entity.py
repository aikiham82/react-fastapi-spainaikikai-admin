"""Insurance entity tests."""

import pytest
from datetime import datetime, timedelta

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType


class TestInsuranceEntity:
    """Test cases for Insurance domain entity."""

    def test_insurance_creation_valid(self):
        """Test valid insurance creation."""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=start_date,
            end_date=end_date,
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        assert insurance.member_id == "member-id"
        assert insurance.club_id == "club-id"
        assert insurance.insurance_type == InsuranceType.ACCIDENT
        assert insurance.policy_number == "POL-12345"
        assert insurance.insurance_company == "Insurance Company Inc"
        assert insurance.coverage_amount == 100000.0
        assert insurance.status == InsuranceStatus.ACTIVE
        assert insurance.payment_id == "payment-id"
        assert insurance.created_at is not None

    def test_insurance_creation_empty_policy_number(self):
        """Test insurance creation with empty policy number raises error."""
        with pytest.raises(ValueError, match="Policy number cannot be empty"):
            Insurance(
                member_id="member-id",
                club_id="club-id",
                insurance_type=InsuranceType.ACCIDENT,
                policy_number="",
                insurance_company="Insurance Company Inc",
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=365),
                coverage_amount=100000.0
            )

    def test_insurance_creation_negative_coverage_amount(self):
        """Test insurance creation with negative coverage amount raises error."""
        with pytest.raises(ValueError, match="Coverage amount cannot be negative"):
            Insurance(
                member_id="member-id",
                club_id="club-id",
                insurance_type=InsuranceType.ACCIDENT,
                policy_number="POL-12345",
                insurance_company="Insurance Company Inc",
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=365),
                coverage_amount=-100000.0
            )

    def test_insurance_activation(self):
        """Test insurance activation."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() + timedelta(days=355),
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.PENDING
        )
        
        insurance.activate()
        assert insurance.status == InsuranceStatus.ACTIVE
        assert insurance.created_at is None

    def test_insurance_deactivation(self):
        """Test insurance deactivation."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() + timedelta(days=355),
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        insurance.deactivate()
        assert insurance.status == InsuranceStatus.INACTIVE

    def test_insurance_cancellation(self):
        """Test insurance cancellation."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() + timedelta(days=355),
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        insurance.cancel()
        assert insurance.status == InsuranceStatus.CANCELLED

    def test_insurance_expiration_check(self):
        """Test insurance expiration check."""
        # Expired insurance
        past_date = datetime.now() - timedelta(days=10)
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=past_date,
            end_date=past_date + timedelta(days=10),
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        assert insurance.is_expired() is True

        # Active insurance
        future_date = datetime.now() + timedelta(days=30)
        insurance.end_date = future_date
        assert insurance.is_expired() is False

    def test_insurance_check_and_update_status(self):
        """Test check and update status method."""
        # Insurance that is expiring in 5 days
        threshold_date = datetime.now() + timedelta(days=5)
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=threshold_date,
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        insurance.check_and_update_status()
        assert insurance.status == InsuranceStatus.ACTIVE

        # Insurance that just expired
        past_date = datetime.now() - timedelta(days=1)
        insurance.end_date = past_date
        insurance.check_and_update_status()
        assert insurance.status == InsuranceStatus.EXPIRED

    def test_insurance_is_expiring_soon(self):
        """Test is expiring soon method."""
        # Insurance expiring in 5 days (threshold)
        start_date = datetime.now() - timedelta(days=10)
        end_date = start_date + timedelta(days=365)
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=start_date,
            end_date=end_date,
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        # 10 days until expiration (more than 30 day threshold)
        assert insurance.is_expiring_soon(30) is False
        
        # 5 days until expiration (exactly 30 day threshold)
        assert insurance.is_expiring_soon(10) is True

        # 1 day until expiration (less than 30 day threshold)
        assert insurance.is_expiring_soon(1) is True

        # Already expired
        insurance.end_date = datetime.now() - timedelta(days=1)
        assert insurance.is_expiring_soon(30) is False

    def test_insurance_update_dates(self):
        """Test insurance dates update."""
        new_start_date = datetime.now() + timedelta(days=7)
        new_end_date = new_start_date + timedelta(days=358)
        
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=365),
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        insurance.update_dates(new_start_date, new_end_date)
        assert insurance.start_date == new_start_date
        assert insurance.end_date == new_end_date

    def test_insurance_update_dates_invalid(self):
        """Test insurance dates update with invalid dates raises error."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=358),
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        with pytest.raises(ValueError, match="Start date must be before end date"):
            insurance.update_dates(
                datetime.now() + timedelta(days=10),
                datetime.now()
            )

    def test_insurance_update_coverage(self):
        """Test coverage amount update."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=365),
            coverage_amount=50000.0,
            payment_id="payment-id"
        )
        
        insurance.update_coverage(75000.0)
        assert insurance.coverage_amount == 75000.0

    def test_insurance_update_coverage_negative(self):
        """Test coverage amount update with negative value raises error."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=365),
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        with pytest.raises(ValueError, match="Coverage amount cannot be negative"):
            insurance.update_coverage(-10000.0)

    def test_insurance_get_days_until_expiry(self):
        """Test get days until expiry method."""
        # Insurance expiring in 30 days
        start_date = datetime.now() + timedelta(days=30)
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=start_date + timedelta(days=365),
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        days = insurance.get_days_until_expiry()
        assert days == 30

        # Insurance expiring in 5 days
        start_date = datetime.now() + timedelta(days=5)
        insurance.end_date = start_date + timedelta(days=365)
        assert insurance.get_days_until_expiry() == 365

        # Expired insurance
        insurance.end_date = datetime.now() - timedelta(days=5)
        assert insurance.get_days_until_expiry() == 5

        # Almost expired insurance
        start_date = datetime.now() + timedelta(days=1)
        insurance.end_date = start_date + timedelta(days=365)
        assert insurance.get_days_until_expiry() == 1

        # Expired insurance (very old)
        insurance.end_date = datetime.now() - timedelta(days=400)
        assert insurance.get_days_until_expiry() == 400

    def test_insurance_is_expiring_soon_various_thresholds(self):
        """Test is expiring soon with various thresholds."""
        start_date = datetime.now() + timedelta(days=30)
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=start_date,
            end_date=start_date + timedelta(days=365),
            coverage_amount=100000.0,
            payment_id="payment-id"
        )
        
        # Test various thresholds
        assert insurance.is_expiring_soon(60) is True
        assert insurance.is_expiring_soon(45) is True
        assert insurance.is_expiring_soon(30) is True
        assert insurance.is_expiring_soon(15) is True
        assert insurance.is_expiring_soon(10) is True
        assert insurance.is_expiring_soon(5) is True
        assert insurance.is_expiring_soon(1) is True
        assert insurance.is_expiring_soon(0) is False

    def test_insurance_activation_with_dates(self):
        """Test insurance activation with dates set."""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=365)
        
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=start_date,
            end_date=end_date,
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.INACTIVE
        )
        
        insurance.activate()
        assert insurance.status == InsuranceStatus.ACTIVE

    def test_insurance_deactivation(self):
        """Test insurance deactivation."""
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=365),
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        insurance.deactivate()
        assert insurance.status == InsuranceStatus.INACTIVE
        assert insurance.is_active() is False

    def test_insurance_cancellation_with_dates(self):
        """Test insurance cancellation with dates set."""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=7)
        
        insurance = Insurance(
            member_id="member-id",
            club_id="club-id",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-12345",
            insurance_company="Insurance Company Inc",
            start_date=start_date,
            end_date=end_date,
            coverage_amount=100000.0,
            payment_id="payment-id",
            status=InsuranceStatus.ACTIVE
        )
        
        insurance.cancel()
        assert insurance.status == InsuranceStatus.CANCELLED
        assert insurance.is_active() is False
