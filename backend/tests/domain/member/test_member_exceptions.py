"""Member exception tests."""

import pytest

from src.domain.exceptions.member import (
    MemberNotFoundError,
    InvalidMemberDataError,
    MemberAlreadyExistsError
)


class TestMemberExceptions:
    """Test cases for Member domain exceptions."""

    def test_member_not_found_error_str(self):
        """Test MemberNotFoundError string representation."""
        error = MemberNotFoundError("member-123")
        assert "member with id member-123 not found" in str(error).lower()

    def test_invalid_member_data_error_str(self):
        """Test InvalidMemberDataError string representation."""
        error = InvalidMemberDataError("Invalid member data")
        assert "invalid member data" in str(error).lower()

    def test_member_already_exists_error_str(self):
        """Test MemberAlreadyExistsError string representation."""
        error = MemberAlreadyExistsError("Member already exists")
        assert error.entity_type == "BusinessRuleViolationError"
        assert "already exists" in str(error).lower()
