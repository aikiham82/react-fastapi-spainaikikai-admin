"""A past year allows any grade licence; a title only follows what the member holds today."""

from datetime import datetime

import pytest

from src.domain.entities.license import InstructorCategory, License, TechnicalGrade, payable_licence_items_for_year

pytestmark = [pytest.mark.unit]

TODAY = datetime(2026, 11, 4)
ADULT = datetime(1980, 1, 1)
GRADES = {"kyu", "kyu_infantil", "dan"}


def licence(instructor: InstructorCategory = InstructorCategory.NONE) -> License:
    return License(
        license_number="QA-1", member_id="member-1", grade="3º Dan",
        technical_grade=TechnicalGrade.DAN, instructor_category=instructor,
    )


@pytest.mark.parametrize(
    ("instructor", "year", "expected"),
    [
        pytest.param(InstructorCategory.NONE, 2025, GRADES, id="dan, last year"),
        pytest.param(InstructorCategory.NONE, 2026, {"dan"}, id="dan, this year"),
        pytest.param(InstructorCategory.NONE, 2027, {"dan"}, id="dan, next year"),
        pytest.param(InstructorCategory.SHIDOIN, 2025, GRADES | {"shidoin"}, id="shidoin, last year"),
        pytest.param(InstructorCategory.SHIDOIN, 2026, {"shidoin"}, id="shidoin, this year"),
    ],
)
def test_payable_licence_items_for_year(instructor, year, expected):
    assert payable_licence_items_for_year([licence(instructor)], ADULT, TODAY, year) == expected
