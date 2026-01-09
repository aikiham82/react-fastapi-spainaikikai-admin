"""Association exception tests."""

import pytest

from src.domain.exceptions.association import (
    AssociationNotFoundError,
    InvalidAssociationDataError,
    InactiveAssociationError
)


class TestAssociationExceptions:
    """Test cases for Association domain exceptions."""

    def test_association_not_found_error(self):
        """Test AssociationNotFoundError string representation."""
        error = AssociationNotFoundError("assoc-123")
        error_str = str(error)
        
        assert "Association" in error_str
        assert "not found" in error_str.lower()
        assert "assoc-123" in error_str

    def test_invalid_association_data_error(self):
        """Test InvalidAssociationDataError."""
        error = InvalidAssociationDataError("Invalid association data")
        error_str = str(error)
        

    def test_inactive_association_error(self):
        """Test InactiveAssociationError."""
        error = InactiveAssociationError("Association is inactive")
        error_str = str(error)
        
        assert "is inactive" in error_str.lower()
