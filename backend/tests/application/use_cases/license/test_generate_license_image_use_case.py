"""The card says the year of the licence it shows."""

from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.license.generate_license_image_use_case import GenerateLicenseImageUseCase

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


def use_case_for(expiration_date):
    licence = SimpleNamespace(license_number="LIC-1", member_id="m1", expiration_date=expiration_date)
    member = SimpleNamespace(first_name="Ana", last_name="Ejemplo", dni=None, birth_date=None)
    images = SimpleNamespace(generate_license_image=AsyncMock(return_value=b"png"))
    return (
        GenerateLicenseImageUseCase(
            SimpleNamespace(find_by_id=AsyncMock(return_value=licence)),
            SimpleNamespace(find_by_id=AsyncMock(return_value=member)),
            images,
        ),
        images,
    )


@pytest.mark.parametrize("expiry_year", [2025, 2026, 2027])
async def test_the_year_is_the_year_the_licence_expires(expiry_year):
    use_case, images = use_case_for(datetime(expiry_year, 12, 31, 23, 59, 59))

    result = await use_case.execute("lic")

    assert images.generate_license_image.await_args.args[0].license_year == expiry_year
    assert result.filename.endswith(f"_{expiry_year}.png")


@pytest.mark.parametrize("today, season", [
    (date(2026, 9, 30), 2026),
    (date(2026, 10, 1), 2027),
])
async def test_a_licence_without_expiry_falls_back_to_the_current_season(today, season, monkeypatch):
    monkeypatch.setattr(
        "src.application.use_cases.license.generate_license_image_use_case.date",
        SimpleNamespace(today=lambda: today),
    )
    use_case, images = use_case_for(None)

    await use_case.execute("lic")

    assert images.generate_license_image.await_args.args[0].license_year == season
