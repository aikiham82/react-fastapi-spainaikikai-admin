"""Club exception tests."""

import pytest

from src.domain.exceptions.club import (
    ClubNotFoundError,
    InvalidClubDataError,
    ClubAlreadyExistsError
)


class TestClubExceptions:
    """Test cases for Club domain exceptions."""

    def test_club_not_found_error(self):
        """Test ClubNotFoundError."""
        error = ClubNotFoundError("club-123")
        assert error.entity_type == "Club"
        assert error.entity_id == "club-123"
        assert str(error) == "Club with id club-123 not found"

    def test_invalid_club_data_error(self):
        """Test InvalidClubDataError."""
        error = InvalidClubDataError("Invalid club data")
        assert error.entity_type == "Club"
        assert str(error) == "Invalid club data"

    def test_club_already_exists_error(self):
        """Test ClubAlreadyExistsError."""
        error = ClubAlreadyExistsError("Club already exists")
        assert "already exists" in str(error).lower()
