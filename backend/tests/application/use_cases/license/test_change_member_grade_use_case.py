"""A member's grade number changes on their current grade licence, never its kind or title."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.license.change_member_grade_use_case import ChangeMemberGradeUseCase
from src.domain.entities.license import InstructorCategory, License, LicenseStatus, TechnicalGrade
from src.domain.exceptions.base import ValidationError
from src.domain.exceptions.license import LicenseNotFoundError

pytestmark = [pytest.mark.unit]


def licence(grade, technical_grade=TechnicalGrade.KYU, instructor_category=InstructorCategory.NONE, **fields):
    return License(
        id=fields.pop("id", "lic-1"),
        license_number="LIC-1",
        member_id="member-ana",
        grade=grade,
        technical_grade=technical_grade,
        instructor_category=instructor_category,
        expiration_date=fields.pop("expiration_date", datetime(2026, 12, 31)),
        **fields,
    )


def repository_with(*licences):
    repository = AsyncMock()
    repository.find_by_member_id.return_value = list(licences)
    repository.update.side_effect = lambda license: license
    return repository


async def change(repository, grade_number):
    return await ChangeMemberGradeUseCase(repository).execute("member-ana", grade_number)


@pytest.mark.parametrize(
    "grade, technical_grade, number, expected",
    [
        ("6º Kyu", TechnicalGrade.KYU, 4, "4º Kyu"),
        ("1er Dan", TechnicalGrade.DAN, 3, "3º Dan"),
        ("1º Dan", TechnicalGrade.DAN, 3, "3º Dan"),
        ("Kyu", TechnicalGrade.KYU, 5, "5º Kyu"),
        ("Kyu Infantil", TechnicalGrade.KYU, 6, "6º Kyu"),
        ("Dan", TechnicalGrade.DAN, 1, "1º Dan"),
    ],
)
async def test_the_number_is_written_keeping_the_kind(grade, technical_grade, number, expected):
    changed = await change(repository_with(licence(grade, technical_grade)), number)

    assert (changed.grade, changed.technical_grade) == (expected, technical_grade)


async def test_the_grade_licence_changes_when_the_title_lives_on_another():
    grade_licence = licence("5º Dan", TechnicalGrade.DAN, id="lic-grade")
    title_licence = licence("Shidoin", TechnicalGrade.DAN, InstructorCategory.SHIDOIN, id="lic-title")

    changed = await change(repository_with(title_licence, grade_licence), 6)

    assert (changed.id, changed.grade, title_licence.grade) == ("lic-grade", "6º Dan", "Shidoin")


async def test_a_title_only_licence_gets_the_number_and_keeps_its_title():
    changed = await change(
        repository_with(licence("Shidoin", TechnicalGrade.DAN, InstructorCategory.SHIDOIN)), 5
    )

    assert (changed.grade, changed.instructor_category) == ("5º Dan", InstructorCategory.SHIDOIN)


async def test_the_licence_that_expires_last_is_the_current_one():
    old = licence("6º Kyu", id="lic-old", expiration_date=datetime(2025, 12, 31))
    current = licence("5º Kyu", id="lic-current", expiration_date=datetime(2026, 12, 31))

    changed = await change(repository_with(old, current), 4)

    assert (changed.id, old.grade) == ("lic-current", "6º Kyu")


async def test_without_expiry_the_latest_created_licence_is_the_current_one():
    older = licence("6º Kyu", id="lic-older", expiration_date=None, created_at=datetime(2024, 1, 1))
    newer = licence("5º Kyu", id="lic-newer", expiration_date=None, created_at=datetime(2025, 1, 1))

    changed = await change(repository_with(older, newer), 4)

    assert changed.id == "lic-newer"


async def test_the_change_is_stamped_on_the_licence():
    changed = await change(repository_with(licence("6º Kyu", updated_at=datetime(2024, 1, 1))), 4)

    assert changed.updated_at > datetime(2024, 1, 1)


@pytest.mark.parametrize("status", [LicenseStatus.EXPIRED, LicenseStatus.REVOKED])
async def test_a_licence_that_is_history_is_never_rewritten(status):
    repository = repository_with(licence("6º Kyu", status=status))

    with pytest.raises(LicenseNotFoundError):
        await change(repository, 4)

    repository.update.assert_not_called()


async def test_a_member_without_licence_cannot_change_grade():
    with pytest.raises(LicenseNotFoundError):
        await change(repository_with(), 3)


@pytest.mark.parametrize(
    "technical_grade, number",
    [(TechnicalGrade.KYU, 0), (TechnicalGrade.KYU, 7), (TechnicalGrade.DAN, 0), (TechnicalGrade.DAN, 11)],
)
async def test_a_number_out_of_range_is_refused(technical_grade, number):
    repository = repository_with(licence("3º Kyu", technical_grade))

    with pytest.raises(ValidationError):
        await change(repository, number)

    repository.update.assert_not_called()
