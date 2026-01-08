"""Association entity tests."""

import pytest
from datetime import datetime

from src.domain.entities.association import Association


@pytest.fixture
def association_fixture():
    """Association fixture for tests."""
    from datetime import datetime
    return Association(
        name="Test Association",
        address="123 Main Street",
        city="Madrid",
        province="Madrid",
        postal_code="28001",
        country="Spain",
        phone="+34912345678",
        email="info@test.com",
        cif="B12345678",
        is_active=True,
        created_at=datetime.utcnow()
    )


class TestAssociationEntity:
    """Test cases for Association domain entity."""

    def test_association_creation_valid(self, association_fixture):
        """Test valid association creation."""
        association = association_fixture

        assert association.name == "Test Association"
        assert association.email == "info@test.com"
        assert association.cif == "B12345678"
        assert association.is_active is True
        assert association.created_at is not None

    def test_association_creation_empty_name(self):
        """Test association creation with empty name raises error."""
        with pytest.raises(ValueError, match="Association name cannot be empty"):
            Association(
                name="",
                address="123 Main Street",
                city="Madrid",
                province="Madrid",
                postal_code="28001",
                country="Spain",
                phone="+34912345678",
                email="info@test.com",
                cif="B12345678"
            )

    def test_association_creation_invalid_email(self):
        """Test association creation with invalid email raises error."""
        with pytest.raises(ValueError, match="Invalid email format"):
            Association(
                name="Test Association",
                address="123 Main Street",
                city="Madrid",
                province="Madrid",
                postal_code="28001",
                country="Spain",
                phone="+34912345678",
                email="invalid-email",
                cif="B12345678"
            )

    def test_association_creation_empty_cif(self):
        """Test association creation with empty CIF raises error."""
        with pytest.raises(ValueError, match="Association CIF cannot be empty"):
            Association(
                name="Test Association",
                address="123 Main Street",
                city="Madrid",
                province="Madrid",
                postal_code="28001",
                country="Spain",
                phone="+34912345678",
                email="info@test.com",
                cif=""
            )

    def test_association_activation(self, association_fixture):
        """Test association activation."""
        assert association_fixture.is_active is True

        association_fixture.deactivate()
        assert association.is_active is False

        association_fixture.activate()
        assert association.is_active is True

    def test_association_deactivation(self, association_fixture):
        """Test association deactivation."""
        association_fixture.deactivate()
        assert association.is_active is False

    def test_association_update_contact_info(self, association_fixture):
        """Test association contact info update."""
        original_phone = association_fixture.phone
        original_email = association_fixture.email

        association_fixture.update_contact_info(
            phone="+34999999999",
            email="newemail@test.com"
        )

        assert association_fixture.phone == "+34999999999"
        assert association_fixture.email == "newemail@test.com"
        assert association_fixture.phone != original_phone
        assert association_fixture.email != original_email

    def test_association_update_contact_info_invalid_email(self, association_fixture):
        """Test association contact info update with invalid email raises error."""
        with pytest.raises(ValueError, match="Invalid email format"):
            association_fixture.update_contact_info(email="invalid-email")
