"""Seminar exception tests."""

import pytest

from src.domain.exceptions.seminar import (
    SeminarNotFoundError,
    InvalidSeminarDatesError,
    SeminarIsFullError
)


class TestSeminarExceptions:
    """Test cases for Seminar domain exceptions."""

    def test_seminar_not_found_error(self):
        """Test SeminarNotFoundError."""
        error = SeminarNotFoundError("seminar-123")
        assert error.entity_type == "Seminar"
        assert error.entity_id == "seminar-123"
        assert "not found" in str(error).lower()

    def test_invalid_seminar_dates_error(self):
        """Test InvalidSeminarDatesError."""
        error = InvalidSeminarDatesError("Invalid seminar dates")
        assert error.entity_type == "Seminar"
        assert "invalid seminar dates" in str(error).lower()

    def test_seminar_is_full_error(self):
        """Test SeminarIsFullError."""
        error = SeminarIsFullError("Seminar is full")
        assert error.entity_type == "Seminar"
        assert "is full" in str(error).lower()
