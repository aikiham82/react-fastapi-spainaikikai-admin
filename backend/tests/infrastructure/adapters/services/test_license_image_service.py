"""A long name stays inside its line of the card, and the insurance line tells the truth."""

from datetime import date, datetime

import pytest

from src.application.ports.license_image_service import LicenseImageData
from src.infrastructure.adapters.services.license_image_service import LicenseImageService

pytestmark = pytest.mark.unit

LONGEST_FIRST_NAME_IN_USE = "N" * 40
LONGEST_LAST_NAME_IN_USE = "M" * 30


@pytest.fixture
def service():
    return LicenseImageService()


def test_a_short_name_keeps_its_size(service):
    assert service._font_that_fits("ANA", 40, service.MAX_WIDTHS["first_name"]).size == 40


@pytest.mark.parametrize("field, text", [
    ("first_name", LONGEST_FIRST_NAME_IN_USE),
    ("surname", LONGEST_LAST_NAME_IN_USE),
])
def test_a_long_name_shrinks_until_it_fits(service, field, text):
    font = service._font_that_fits(text, 40, service.MAX_WIDTHS[field])

    assert font.getlength(text) <= service.MAX_WIDTHS[field]


@pytest.mark.parametrize("end_date, text", [
    (datetime(2026, 9, 30, 23, 59, 59), "30/09/2026"),
    (None, "SIN SEGURO"),
])
def test_the_insurance_line_is_its_end_date_or_says_there_is_none(service, end_date, text):
    assert service._insurance_text(end_date) == text


@pytest.mark.asyncio
async def test_the_card_is_drawn_with_a_long_name(service):
    image = await service.generate_license_image(LicenseImageData(
        license_number="LIC-1",
        first_name=LONGEST_FIRST_NAME_IN_USE,
        last_name=LONGEST_LAST_NAME_IN_USE,
        dni="00000000T",
        birth_date=date(1990, 5, 1),
        insurance_end_date=date(2026, 12, 31),
        license_year=2026,
    ))

    assert image.startswith(b"\x89PNG")
