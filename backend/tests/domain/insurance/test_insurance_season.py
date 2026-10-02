"""Tests for the insurance season window."""

from datetime import datetime

import pytest

from src.domain.entities.insurance import insurance_season, insurance_season_year


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


@pytest.mark.unit
@pytest.mark.domain
class TestInsuranceSeasonYear:
    def test_a_date_before_october_belongs_to_the_season_ending_that_year(self):
        assert insurance_season_year(datetime(2026, 9, 30, 23, 59, 59)) == 2026

    def test_a_date_from_october_belongs_to_the_season_ending_next_year(self):
        assert insurance_season_year(datetime(2026, 10, 1)) == 2027

    def test_the_season_of_a_date_contains_that_date(self):
        paid_at = datetime(2026, 10, 2)

        start, end = insurance_season(insurance_season_year(paid_at))

        assert start <= paid_at <= end
