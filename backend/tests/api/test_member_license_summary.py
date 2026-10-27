"""The member list shows the grade and the instructor title, even when they live on separate licences."""

from datetime import datetime

import pytest

from src.domain.entities.license import InstructorCategory, License, TechnicalGrade
from src.infrastructure.web.routers.members import _build_license_summary

pytestmark = [pytest.mark.unit]


def licence(grade, instructor_category=InstructorCategory.NONE, **fields):
    return License(license_number="LIC-1", member_id="member-ana", grade=grade,
                   technical_grade=TechnicalGrade.DAN, instructor_category=instructor_category,
                   expiration_date=fields.pop("expiration_date", datetime(2026, 12, 31)), **fields)


def test_a_title_on_another_licence_shows_with_the_grade():
    summary = _build_license_summary([licence("5º Dan"), licence("Shidoin", InstructorCategory.SHIDOIN)])

    assert (summary.grade, summary.instructor_category) == ("5º Dan", "shidoin")


def test_the_order_of_the_licences_does_not_matter():
    summary = _build_license_summary([licence("Shidoin", InstructorCategory.SHIDOIN), licence("5º Dan")])

    assert (summary.grade, summary.instructor_category) == ("5º Dan", "shidoin")


def test_shidoin_outranks_fukushidoin():
    summary = _build_license_summary([
        licence("3º Dan", InstructorCategory.FUKUSHIDOIN),
        licence("Shidoin", InstructorCategory.SHIDOIN),
    ])

    assert summary.instructor_category == "shidoin"


def test_a_single_licence_keeps_its_grade_and_title():
    summary = _build_license_summary([licence("4º Dan", InstructorCategory.FUKUSHIDOIN)])

    assert (summary.grade, summary.instructor_category) == ("4º Dan", "fukushidoin")


def test_a_title_only_licence_alone_still_shows():
    summary = _build_license_summary([licence("Shidoin", InstructorCategory.SHIDOIN)])

    assert (summary.grade, summary.instructor_category) == ("Shidoin", "shidoin")


def test_no_licence_gives_no_summary():
    assert _build_license_summary([]) is None
