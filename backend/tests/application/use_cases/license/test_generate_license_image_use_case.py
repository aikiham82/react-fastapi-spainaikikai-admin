"""The card says the year of the licence it shows and the insurance the member really holds."""

from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.license.generate_license_image_use_case import GenerateLicenseImageUseCase
from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]

LICENCE_EXPIRY = datetime(2026, 12, 31, 23, 59, 59)
ENDED = datetime(2026, 9, 30, 23, 59, 59)
IN_FORCE = datetime(2027, 9, 30, 23, 59, 59)


def an_insurance(end_date, insurance_type=InsuranceType.ACCIDENT, status=InsuranceStatus.ACTIVE):
    return Insurance(
        member_id="m1",
        insurance_type=insurance_type,
        policy_number="POL-1",
        insurance_company="Aseguradora Ejemplo",
        start_date=datetime(2020, 1, 1),
        end_date=end_date,
        status=status,
    )


def use_case_for(expiration_date=LICENCE_EXPIRY, insurances=()):
    licence = SimpleNamespace(license_number="LIC-1", member_id="m1", expiration_date=expiration_date)
    member = SimpleNamespace(first_name="Ana", last_name="Ejemplo", dni=None, birth_date=None)
    images = SimpleNamespace(generate_license_image=AsyncMock(return_value=b"png"))
    insurance_repository = SimpleNamespace(find_by_member_id=AsyncMock(return_value=list(insurances)))
    return (
        GenerateLicenseImageUseCase(
            SimpleNamespace(find_by_id=AsyncMock(return_value=licence)),
            SimpleNamespace(find_by_id=AsyncMock(return_value=member)),
            insurance_repository,
            images,
        ),
        images,
    )


async def drawn(use_case, images):
    await use_case.execute("lic")
    return images.generate_license_image.await_args.args[0]


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


@pytest.mark.parametrize("insurances, end_date", [
    ([], None),
    ([an_insurance(ENDED)], ENDED),
    ([an_insurance(ENDED), an_insurance(IN_FORCE)], IN_FORCE),
    ([an_insurance(IN_FORCE), an_insurance(ENDED)], IN_FORCE),
    ([an_insurance(IN_FORCE)], IN_FORCE),
    ([an_insurance(ENDED), an_insurance(IN_FORCE, status=InsuranceStatus.CANCELLED)], ENDED),
    ([an_insurance(IN_FORCE, status=InsuranceStatus.CANCELLED)], None),
    ([an_insurance(IN_FORCE, insurance_type=InsuranceType.CIVIL_LIABILITY)], None),
    ([an_insurance(None)], None),
], ids=[
    "no insurance",
    "only one that ended",
    "ended, then renewed",
    "renewed, then ended",
    "only one in force",
    "the newest was cancelled",
    "only a cancelled one",
    "only civil liability",
    "no end date",
])
async def test_the_card_carries_the_end_of_the_accident_insurance(insurances, end_date):
    use_case, images = use_case_for(insurances=insurances)

    assert (await drawn(use_case, images)).insurance_end_date == end_date


async def test_the_expiry_of_the_licence_never_stands_in_for_the_insurance():
    use_case, images = use_case_for(LICENCE_EXPIRY, insurances=[])

    assert (await drawn(use_case, images)).insurance_end_date != LICENCE_EXPIRY
