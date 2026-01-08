"""Member entity tests."""

import pytest
from datetime import datetime

from src.domain.entities.member import Member, MemberStatus
from src.domain.exceptions.member import (
    MemberNotFoundError,
    InvalidMemberDataError,
    MemberAlreadyExistsError,
    InvalidClubForMemberError
)


class TestMemberEntity:
    """Test cases for Member domain entity."""

    @pytest.fixture
    def member_fixture(self):
        """Member fixture."""
        from datetime import datetime
        return Member(
            first_name="John",
            last_name="Doe",
            dni="12345678A",
            email="john.doe@example.com",
            phone="+34612345678",
            address="123 Street",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="Spain",
            birth_date=datetime(1990, 1, 1),
            federation_number="LIC-123",
            club_id="club-123",
            status=MemberStatus.ACTIVE,
            registration_date=datetime.utcnow()
        )

    def test_member_creation_valid(self, member_fixture):
        """Test valid member creation."""
        assert member_fixture.first_name == "John"
        assert member_fixture.last_name == "Doe"
        assert member_fixture.dni == "12345678A"
        assert member_fixture.email == "john.doe@example.com"
        assert member_fixture.status == MemberStatus.ACTIVE
        assert member_fixture.club_id == "club-123"
        assert member_fixture.registration_date is not None

    def test_member_creation_empty_first_name(self):
        """Test member creation with empty first name raises error."""
        with pytest.raises(ValueError, match="Member first name cannot be empty"):
            Member(
                first_name="",
                last_name="Doe",
                dni="12345678A",
                email="john.doe@example.com",
                phone="+34612345678",
                address="123 Street",
                city="Madrid",
                province="Madrird",
                postal_code="28001",
                country="Spain",
                birth_date=datetime(1990, 1, 1),
                federation_number="LIC-123",
                club_id="club-123"
            )

    def test_member_creation_invalid_email(self):
        """Test member creation with invalid email raises error."""
        with pytest.raises(ValueError, match="Invalid email format"):
            Member(
                first_name="John",
                last_name="Doe",
                dni="12345678A",
                email="invalid-email",
                phone="+34612345678",
                address="123 Street",
                city="Madrid",
                province="Madrid",
                postal_code="28001",
                country="Spain",
                birth_date=datetime(1990, 1, 1),
                federation_number="LIC-123",
                club_id="club-123"
            )

    def test_member_activation(self, member_fixture):
        """Test member activation."""
        assert member_fixture.is_active is True

    def test_member_deactivation(self, member_fixture):
        """Test member deactivation."""
        member_fixture.deactivate()
        assert member_fixture.is_active is False

    def test_member_suspension(self, member_fixture):
        """Test member suspension."""
        member_fixture.suspend()
        assert member_fixture.status == MemberStatus.SUSPENDED

    def test_member_get_full_name(self, member_fixture):
        """Test get_full_name method."""
        assert member_fixture.get_full_name() == "John Doe"

    def test_member_update_personal_info(self, member_fixture):
        """Test member personal info update."""
        member_fixture.update_personal_info(
            email="newemail@example.com",
            phone="+34999988888"
        )
        assert member_fixture.email == "newemail@example.com"
        assert member_fixture.phone == "+34999988888"

    def test_member_update_personal_info_invalid_email(self, member_fixture):
        """Test personal info update with invalid email raises error."""
        with pytest.raises(ValueError, match="Invalid email format"):
            member_fixture.update_personal_info(email="invalid-email")

    def test_member_change_club(self, member_fixture):
        """Test member club change."""
        new_club_id = "new-club-456"
        member_fixture.change_club(new_club_id)
        assert member_fixture.club_id == "new-club-456"

    def test_member_change_club_invalid(self, member_fixture):
        """Test member club change with invalid club id raises error."""
        with pytest.raises(ValueError, match="Club ID cannot be empty"):
            member_fixture.change_club("")
