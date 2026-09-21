"""Tests for the pattern that matches a user name as people type it."""

import re

import pytest

from src.infrastructure.adapters.repositories.mongodb_user_repository import (
    build_loose_username_pattern,
)


def matches(pattern: str, stored_username: str) -> bool:
    """Apply the pattern the way Mongo would, case-insensitively."""
    return re.match(pattern, stored_username, re.IGNORECASE) is not None


@pytest.mark.unit
@pytest.mark.repository
class TestBuildLooseUsernamePattern:
    """Test suite for matching a typed user name against the stored one."""

    def test_matches_the_exact_name(self):
        """Test that the name as stored still matches."""
        assert matches(build_loose_username_pattern("KUKI AIKIKAI"), "KUKI AIKIKAI")

    def test_matches_a_different_case(self):
        """Test that nobody has to reproduce the capitals of the migration."""
        assert matches(build_loose_username_pattern("kuki aikikai"), "KUKI AIKIKAI")

    def test_matches_a_stored_name_with_a_double_space(self):
        """Test the real name 'AIKIDO VALENCIA  (ANTIGUO DOJO SINTAGMA)'."""
        pattern = build_loose_username_pattern("aikido valencia (antiguo dojo sintagma)")

        assert matches(pattern, "AIKIDO VALENCIA  (ANTIGUO DOJO SINTAGMA)")

    def test_matches_when_the_typed_name_carries_extra_spaces(self):
        """Test that trailing and repeated spaces typed by hand do not matter."""
        pattern = build_loose_username_pattern("  KUKI   AIKIKAI ")

        assert matches(pattern, "KUKI AIKIKAI")

    def test_does_not_match_a_different_name(self):
        """Test that the match is anchored instead of a substring search."""
        pattern = build_loose_username_pattern("KUKI")

        assert not matches(pattern, "KUKI AIKIKAI")

    def test_escapes_regular_expression_characters(self):
        """Test that a name with parentheses or dots is treated as text."""
        pattern = build_loose_username_pattern("A.N.A.M YOAKEKAI")

        assert matches(pattern, "A.N.A.M YOAKEKAI")
        assert not matches(pattern, "AXNXAXM YOAKEKAI")
