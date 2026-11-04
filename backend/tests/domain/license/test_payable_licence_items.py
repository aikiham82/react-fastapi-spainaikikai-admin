"""Which licence or title a member may pay, mirroring what the payment screen offers."""

from datetime import datetime

import pytest

from src.domain.entities.license import (
    AgeCategory,
    InstructorCategory,
    License,
    LicenseStatus,
    TechnicalGrade,
    payable_licence_items,
)

pytestmark = [pytest.mark.unit]

TODAY = datetime(2026, 11, 4)
ADULT = datetime(1980, 1, 1)
CHILD = datetime(2016, 1, 1)


def licence(
    grade: TechnicalGrade = TechnicalGrade.DAN,
    instructor: InstructorCategory = InstructorCategory.NONE,
    age: AgeCategory = AgeCategory.ADULTO,
    status: LicenseStatus = LicenseStatus.ACTIVE,
    text: str = "1º",
    expires: datetime = datetime(2026, 12, 31),
) -> License:
    return License(
        license_number="QA-1", member_id="member-1", grade=text, technical_grade=grade,
        instructor_category=instructor, age_category=age, status=status, expiration_date=expires,
    )


KYU = TechnicalGrade.KYU
SHIDOIN = InstructorCategory.SHIDOIN
FUKUSHIDOIN = InstructorCategory.FUKUSHIDOIN


@pytest.mark.parametrize(
    ("licences", "birth_date", "expected"),
    [
        pytest.param([], ADULT, {"kyu", "kyu_infantil", "dan"}, id="no licence"),
        pytest.param([licence(KYU)], ADULT, {"kyu", "dan"}, id="adult kyu"),
        pytest.param([licence(KYU, age=AgeCategory.INFANTIL)], CHILD, {"kyu_infantil", "dan"}, id="child kyu"),
        pytest.param([licence(KYU, age=AgeCategory.INFANTIL)], ADULT, {"kyu", "dan"}, id="child licence, adult by birth date"),
        pytest.param([licence(KYU, text="3º Kyu Infantil")], None, {"kyu_infantil", "dan"}, id="child grade text, no birth date"),
        pytest.param([licence(KYU, text="3º Kyu")], None, {"kyu", "dan"}, id="adult grade text, no birth date"),
        pytest.param([licence(KYU, age=AgeCategory.INFANTIL, text="3º Kyu")], None, {"kyu", "dan"}, id="grade number changed on a child, no birth date"),
        pytest.param([licence()], ADULT, {"dan"}, id="dan"),
        pytest.param([licence(age=AgeCategory.INFANTIL)], CHILD, {"dan"}, id="child dan"),
        pytest.param([licence(instructor=SHIDOIN)], ADULT, {"shidoin"}, id="shidoin"),
        pytest.param([licence(instructor=FUKUSHIDOIN)], ADULT, {"fukushidoin"}, id="fukushidoin"),
        pytest.param([licence(KYU, SHIDOIN)], ADULT, {"shidoin"}, id="inconsistent kyu with shidoin"),
        pytest.param([licence(text="5º Dan"), licence(instructor=SHIDOIN, text="Shidoin")], ADULT, {"shidoin"}, id="dan and a title"),
        pytest.param([licence(text="2º Dan"), licence(instructor=FUKUSHIDOIN, text="Fukushidoin")], ADULT, {"fukushidoin"}, id="dan and a lower title"),
        pytest.param([licence(KYU, status=LicenseStatus.EXPIRED), licence(instructor=SHIDOIN)], ADULT, {"shidoin"}, id="expired kyu and a title"),
        pytest.param([licence(KYU, status=LicenseStatus.EXPIRED), licence()], ADULT, {"dan"}, id="expired kyu and a dan"),
        pytest.param([licence(instructor=SHIDOIN, status=LicenseStatus.REVOKED), licence()], ADULT, {"dan"}, id="revoked title and a dan"),
        pytest.param([licence(KYU, status=LicenseStatus.EXPIRED)], ADULT, {"kyu", "dan"}, id="only an expired kyu"),
    ],
)
def test_payable_licence_items(licences, birth_date, expected):
    assert payable_licence_items(licences, birth_date, TODAY) == expected


def test_a_child_turns_adult_the_day_after_being_fourteen():
    assert "kyu_infantil" in payable_licence_items([licence(KYU)], datetime(2012, 11, 5), TODAY)
    assert "kyu" in payable_licence_items([licence(KYU)], datetime(2011, 11, 4), TODAY)
