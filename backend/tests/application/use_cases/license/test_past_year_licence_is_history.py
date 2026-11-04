"""A line of a past year records what was paid; it gives no licence to someone holding a later one."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.license.generate_licenses_from_payment_use_case import GenerateLicensesFromPaymentUseCase
from src.domain.entities.license import InstructorCategory, License, TechnicalGrade
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


def held(grade: TechnicalGrade, expires: datetime) -> License:
    return License(
        id="lic-1", license_number="QA-1", member_id="member-1", grade="1º", technical_grade=grade,
        instructor_category=InstructorCategory.NONE, expiration_date=expires,
    )


def line(payment_type: MemberPaymentType, year: int) -> MemberPayment:
    return MemberPayment(
        id="line-1", payment_id="pay-1", member_id="member-1", payment_year=year, payment_type=payment_type,
        concept="line", amount=15, status=MemberPaymentStatus.COMPLETED,
    )


def repository(licences: list) -> MagicMock:
    return MagicMock(
        find_active_by_member_year=AsyncMock(return_value=None),
        find_by_member_id=AsyncMock(return_value=licences),
        count_by_license_number_prefix=AsyncMock(return_value=0),
        create=AsyncMock(side_effect=lambda licence: licence),
        update=AsyncMock(side_effect=lambda licence: licence),
    )


async def test_an_old_kyu_line_creates_no_licence_for_a_later_dan():
    repo = repository([held(TechnicalGrade.DAN, datetime(2026, 12, 31))])

    await GenerateLicensesFromPaymentUseCase(repo).execute([line(MemberPaymentType.LICENCIA_KYU, 2024)], "pay-1", 2024)

    repo.create.assert_not_awaited()
    repo.update.assert_not_awaited()


async def test_a_title_still_creates_its_licence_beside_a_later_dan():
    repo = repository([held(TechnicalGrade.DAN, datetime(2026, 12, 31))])

    await GenerateLicensesFromPaymentUseCase(repo).execute([line(MemberPaymentType.TITULO_SHIDOIN, 2025)], "pay-1", 2025)

    repo.create.assert_awaited_once()


async def test_a_kyu_line_of_the_same_year_as_the_dan_still_creates_its_licence():
    repo = repository([held(TechnicalGrade.DAN, datetime(2024, 12, 31))])

    await GenerateLicensesFromPaymentUseCase(repo).execute([line(MemberPaymentType.LICENCIA_KYU, 2024)], "pay-1", 2024)

    repo.create.assert_awaited_once()


async def test_a_member_without_licences_still_gets_one_for_a_past_year():
    repo = repository([])

    await GenerateLicensesFromPaymentUseCase(repo).execute([line(MemberPaymentType.LICENCIA_KYU, 2024)], "pay-1", 2024)

    repo.create.assert_awaited_once()
