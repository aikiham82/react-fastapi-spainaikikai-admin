"""A licence is created with the categories it is given."""

from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.license.create_license_use_case import CreateLicenseUseCase
from src.domain.entities.license import AgeCategory, InstructorCategory, LicenseType, TechnicalGrade

pytestmark = [pytest.mark.unit]


@pytest.fixture
def repository():
    repository = AsyncMock()
    repository.find_by_license_number.return_value = None
    repository.create.side_effect = lambda license: license
    return repository


async def test_a_licence_is_created_with_its_categories(repository):
    license = await CreateLicenseUseCase(repository).execute(
        license_number="LIC-1",
        member_id="member-ana",
        grade="2 dan",
        technical_grade="dan",
        instructor_category="shidoin",
        age_category="adulto",
    )

    assert (license.technical_grade, license.instructor_category, license.age_category, license.license_type) == (
        TechnicalGrade.DAN, InstructorCategory.SHIDOIN, AgeCategory.ADULTO, LicenseType.DAN
    )


async def test_a_dan_licence_without_technical_grade_is_a_dan(repository):
    license = await CreateLicenseUseCase(repository).execute(
        license_number="LIC-3", member_id="member-eva", grade="3º Dan", license_type="dan"
    )

    assert license.technical_grade == TechnicalGrade.DAN


async def test_an_explicit_licence_type_is_kept(repository):
    license = await CreateLicenseUseCase(repository).execute(
        license_number="LIC-4", member_id="member-eva", grade="2º Dan",
        license_type="instructor", technical_grade="dan",
    )

    assert (license.license_type, license.technical_grade) == (LicenseType.INSTRUCTOR, TechnicalGrade.DAN)


async def test_a_licence_without_categories_defaults_to_kyu_adult(repository):
    license = await CreateLicenseUseCase(repository).execute(
        license_number="LIC-2", member_id="member-luis", grade="5 kyu", license_type="kyu"
    )

    assert (license.technical_grade, license.instructor_category, license.age_category) == (
        TechnicalGrade.KYU, InstructorCategory.NONE, AgeCategory.ADULTO
    )
