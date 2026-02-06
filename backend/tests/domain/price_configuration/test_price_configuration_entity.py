"""Price configuration entity tests."""

import pytest
from datetime import datetime, timedelta

from src.domain.entities.price_configuration import PriceConfiguration


class TestPriceConfigurationEntity:
    """Test cases for PriceConfiguration domain entity."""

    # License category tests
    def test_license_creation_valid(self):
        """Test valid license price configuration creation."""
        config = PriceConfiguration(
            key="dan-none-adulto",
            price=50.0,
            description="Dan adulto sin instructor",
            category="license"
        )

        assert config.key == "dan-none-adulto"
        assert config.price == 50.0
        assert config.description == "Dan adulto sin instructor"
        assert config.category == "license"
        assert config.is_active is True
        assert config.created_at is not None
        assert config.updated_at is not None

    def test_license_default_category(self):
        """Test that category defaults to 'license' for backward compatibility."""
        config = PriceConfiguration(
            key="kyu-none-infantil",
            price=30.0,
            description="Kyu infantil"
        )

        assert config.category == "license"

    def test_license_invalid_key_format_wrong_parts(self):
        """Test license with invalid key format (wrong number of parts) raises error."""
        with pytest.raises(ValueError, match="Invalid key format"):
            PriceConfiguration(
                key="dan-none",  # Missing age category
                price=50.0,
                category="license"
            )

    def test_license_invalid_technical_grade(self):
        """Test license with invalid technical grade raises error."""
        with pytest.raises(ValueError, match="Invalid technical_grade"):
            PriceConfiguration(
                key="shodan-none-adulto",  # 'shodan' is not valid
                price=50.0,
                category="license"
            )

    def test_license_invalid_instructor_category(self):
        """Test license with invalid instructor category raises error."""
        with pytest.raises(ValueError, match="Invalid instructor_category"):
            PriceConfiguration(
                key="dan-sensei-adulto",  # 'sensei' is not valid
                price=50.0,
                category="license"
            )

    def test_license_invalid_age_category(self):
        """Test license with invalid age category raises error."""
        with pytest.raises(ValueError, match="Invalid age_category"):
            PriceConfiguration(
                key="dan-none-senior",  # 'senior' is not valid
                price=50.0,
                category="license"
            )

    def test_license_properties_extraction(self):
        """Test extracting properties from license key."""
        config = PriceConfiguration(
            key="dan-fukushidoin-adulto",
            price=50.0,
            category="license"
        )

        assert config.technical_grade == "dan"
        assert config.instructor_category == "fukushidoin"
        assert config.age_category == "adulto"

    def test_license_generate_key(self):
        """Test generating license key from parts."""
        key = PriceConfiguration.generate_key("dan", "shidoin", "adulto")
        assert key == "dan-shidoin-adulto"

        # Test case insensitivity
        key = PriceConfiguration.generate_key("DAN", "SHIDOIN", "ADULTO")
        assert key == "dan-shidoin-adulto"

    # Insurance category tests
    def test_insurance_creation_valid(self):
        """Test valid insurance price configuration creation."""
        config = PriceConfiguration(
            key="seguro_accidentes",
            price=25.0,
            description="Seguro de accidentes",
            category="insurance"
        )

        assert config.key == "seguro_accidentes"
        assert config.price == 25.0
        assert config.category == "insurance"

    def test_insurance_flexible_key_format(self):
        """Test insurance allows flexible key format."""
        # Should work with any non-empty key
        config = PriceConfiguration(
            key="seguro_rc",
            price=30.0,
            category="insurance"
        )
        assert config.key == "seguro_rc"

        # Should work with keys containing dashes (not enforcing 3-part format)
        config2 = PriceConfiguration(
            key="seguro-responsabilidad-civil",
            price=35.0,
            category="insurance"
        )
        assert config2.key == "seguro-responsabilidad-civil"

    def test_insurance_properties_raise_error(self):
        """Test that license-specific properties raise error for insurance category."""
        config = PriceConfiguration(
            key="seguro_accidentes",
            price=25.0,
            category="insurance"
        )

        with pytest.raises(ValueError, match="technical_grade property is only available for license category"):
            _ = config.technical_grade

        with pytest.raises(ValueError, match="instructor_category property is only available for license category"):
            _ = config.instructor_category

        with pytest.raises(ValueError, match="age_category property is only available for license category"):
            _ = config.age_category

    # Club fee category tests
    def test_club_fee_creation_valid(self):
        """Test valid club fee price configuration creation."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            description="Cuota anual del club",
            category="club_fee"
        )

        assert config.key == "club_fee"
        assert config.price == 100.0
        assert config.category == "club_fee"

    def test_club_fee_flexible_key_format(self):
        """Test club fee allows flexible key format."""
        config = PriceConfiguration(
            key="cuota_mensual",
            price=50.0,
            category="club_fee"
        )
        assert config.key == "cuota_mensual"

    def test_club_fee_properties_raise_error(self):
        """Test that license-specific properties raise error for club_fee category."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee"
        )

        with pytest.raises(ValueError, match="technical_grade property is only available for license category"):
            _ = config.technical_grade

        with pytest.raises(ValueError, match="instructor_category property is only available for license category"):
            _ = config.instructor_category

        with pytest.raises(ValueError, match="age_category property is only available for license category"):
            _ = config.age_category

    # Category validation tests
    def test_invalid_category(self):
        """Test invalid category raises error."""
        with pytest.raises(ValueError, match="Invalid category"):
            PriceConfiguration(
                key="some_key",
                price=50.0,
                category="membership"  # Not a valid category
            )

    # Common validation tests
    def test_empty_key_raises_error(self):
        """Test empty key raises error."""
        with pytest.raises(ValueError, match="Price configuration key cannot be empty"):
            PriceConfiguration(
                key="",
                price=50.0,
                category="insurance"
            )

    def test_whitespace_key_raises_error(self):
        """Test whitespace-only key raises error."""
        with pytest.raises(ValueError, match="Price configuration key cannot be empty"):
            PriceConfiguration(
                key="   ",
                price=50.0,
                category="insurance"
            )

    def test_negative_price_raises_error(self):
        """Test negative price raises error."""
        with pytest.raises(ValueError, match="Price cannot be negative"):
            PriceConfiguration(
                key="club_fee",
                price=-10.0,
                category="club_fee"
            )

    # Business methods tests
    def test_activate(self):
        """Test activating a price configuration."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=False
        )

        config.activate()
        assert config.is_active is True
        assert config.updated_at is not None

    def test_deactivate(self):
        """Test deactivating a price configuration."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee"
        )

        config.deactivate()
        assert config.is_active is False
        assert config.updated_at is not None

    def test_update_price_valid(self):
        """Test updating price with valid value."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee"
        )

        old_updated_at = config.updated_at
        config.update_price(150.0)

        assert config.price == 150.0
        assert config.updated_at > old_updated_at

    def test_update_price_negative_raises_error(self):
        """Test updating price with negative value raises error."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee"
        )

        with pytest.raises(ValueError, match="Price cannot be negative"):
            config.update_price(-50.0)

    def test_is_valid_now_active_no_dates(self):
        """Test is_valid_now returns True for active config without date constraints."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=True
        )

        assert config.is_valid_now() is True

    def test_is_valid_now_inactive(self):
        """Test is_valid_now returns False for inactive config."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=False
        )

        assert config.is_valid_now() is False

    def test_is_valid_now_future_valid_from(self):
        """Test is_valid_now returns False when valid_from is in future."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=True,
            valid_from=datetime.now() + timedelta(days=1)
        )

        assert config.is_valid_now() is False

    def test_is_valid_now_past_valid_until(self):
        """Test is_valid_now returns False when valid_until is in past."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=True,
            valid_until=datetime.now() - timedelta(days=1)
        )

        assert config.is_valid_now() is False

    def test_is_valid_now_within_date_range(self):
        """Test is_valid_now returns True when current date is within valid range."""
        config = PriceConfiguration(
            key="club_fee",
            price=100.0,
            category="club_fee",
            is_active=True,
            valid_from=datetime.now() - timedelta(days=1),
            valid_until=datetime.now() + timedelta(days=1)
        )

        assert config.is_valid_now() is True
