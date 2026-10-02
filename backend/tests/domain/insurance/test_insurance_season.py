"""Tests for the insurance season window."""

from datetime import datetime

import pytest

from src.domain.entities.insurance import insurance_season


@pytest.mark.unit
@pytest.mark.domain
class TestInsuranceSeason:
    def test_payment_year_covers_october_of_previous_year_to_september(self):
        start, end = insurance_season(2026)

        assert start == datetime(2025, 10, 1)
        assert end == datetime(2026, 9, 30, 23, 59, 59)

    def test_season_datetimes_are_naive(self):
        start, end = insurance_season(2026)

        assert start.tzinfo is None
        assert end.tzinfo is None

    def test_season_start_is_before_end(self):
        start, end = insurance_season(2027)

        assert start < end
