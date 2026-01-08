"""Club entity tests."""

import pytest
from datetime import datetime

from src.domain.entities.club import Club
from src.domain.exceptions.club import (
    ClubNotFoundError,
    InvalidClubDataError,
    ClubAlreadyExistsError
)


class TestClubEntity:
    """Test cases for Club domain entity."""

    def test_club_creation_valid(self):
        """Test valid club creation."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            association_id="association-id"
        )
        
        assert club.name == "Test Club"
        assert club.email == "info@club.com"
        assert club.federation_number == "FC-123"
        assert club.association_id == "association-id"
        assert club.is_active is True
        assert club.created_at is not None

    def test_club_creation_empty_name(self):
        """Test club creation with empty name raises error."""
        with pytest.raises(ValueError, match="Club name cannot be empty"):
            Club(
                name="",
                address="456 Avenue",
                city="Barcelona",
                province="Barcelona",
                postal_code="08001",
                country="Spain",
                phone="+34938765432",
                email="info@club.com",
                federation_number="FC-123"
            )

    def test_club_creation_invalid_email(self):
        """Test club creation with invalid email raises error."""
        with pytest.raises(ValueError, match="Invalid email format"):
            Club(
                name="Test Club",
                address="456 Avenue",
                city="Barcelona",
                province="Barcelona",
                postal_code="08001",
                country="Spain",
                phone="+34938765432",
                email="invalid-email",
                federation_number="FC-123"
            )

    def test_club_creation_empty_federation_number(self):
        """Test club creation with empty federation number raises error."""
        with pytest.raises(ValueError, match="Federation number cannot be empty"):
            Club(
                name="Test Club",
                address="456 Avenue",
                city="Barcelona",
                province="Barcelona",
                postal_code="08001",
                country="Spain",
                phone="+34938765432",
                email="info@club.com",
                federation_number=""
            )

    def test_club_activation(self):
        """Test club activation."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            is_active=False
        )
        
        club.activate()
        assert club.is_active is True

    def test_club_deactivation(self):
        """Test club deactivation."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            is_active=True
        )
        
        club.deactivate()
        assert club.is_active is False

    def test_club_update_contact_info(self):
        """Test club contact info update."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            is_active=True
        )
        
        club.update_contact_info(phone="+34999999999", email="newemail@club.com")
        assert club.phone == "+34999999999"
        assert club.email == "newemail@club.com"

    def test_club_update_contact_info_invalid_email(self):
        """Test club contact info update with invalid email raises error."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            is_active=True
        )
        
        with pytest.raises(ValueError, match="Invalid email format"):
            club.update_contact_info(email="invalid-email")

    def test_club_update_address(self):
        """Test club address update."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            is_active=True
        )
        
        club.update_address(
            address="789 New Street",
            city="Valencia",
            province="Valencia",
            postal_code="46001",
            country="Spain"
        )
        
        assert club.address == "789 New Street"
        assert club.city == "Valencia"
        assert club.province == "Valencia"
        assert club.postal_code == "46001"

    def test_club_change_club(self):
        """Test club change."""
        club = Club(
            name="Test Club",
            address="456 Avenue",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="Spain",
            phone="+34938765432",
            email="info@club.com",
            federation_number="FC-123",
            association_id="old-club-id"
        )
        
        club.club_id = "new-club-id"
        assert club.club_id == "new-club-id"
