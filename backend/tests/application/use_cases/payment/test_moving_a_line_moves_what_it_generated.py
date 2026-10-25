"""Moving a payment line to another year moves the licence or insurance that payment generated."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.payment.update_member_payment_use_case import UpdateMemberPaymentUseCase
from src.domain.entities.insurance import Insurance, InsuranceType, insurance_season
from src.domain.entities.license import License, LicenseType
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType

pytestmark = [pytest.mark.unit]

MEMBER = "member-ana"
PAYMENT = "payment-1"


def line(payment_type: MemberPaymentType) -> MemberPayment:
    return MemberPayment(
        id="mp-1", payment_id=PAYMENT, member_id=MEMBER, payment_year=2026,
        payment_type=payment_type, amount=20, status=MemberPaymentStatus.COMPLETED,
    )


def licence(license_type: LicenseType, payment_id: str = PAYMENT) -> License:
    return License(
        id=f"license-{license_type.value}-{payment_id}", license_number="LIC-1", member_id=MEMBER, grade="Dan",
        license_type=license_type, last_payment_id=payment_id,
        issue_date=datetime(2026, 1, 1), expiration_date=datetime(2026, 12, 31, 23, 59, 59),
    )


def insurance(insurance_type: InsuranceType) -> Insurance:
    start, end = insurance_season(2026)
    return Insurance(
        id=f"insurance-{insurance_type.value}", member_id=MEMBER, insurance_type=insurance_type,
        policy_number="PENDIENTE", insurance_company="Spain Aikikai",
        start_date=start, end_date=end, payment_id=PAYMENT,
    )


def use_case(mp: MemberPayment, licences=(), insurances=()):
    member_payments = AsyncMock()
    member_payments.find_by_id.return_value = mp
    member_payments.update.side_effect = lambda updated: updated
    member_payments.find_by_payment_id.return_value = [mp]
    member_payments.exists_for_member_year_type.return_value = False
    payments = AsyncMock()
    payments.find_by_id.return_value = None
    licence_repository = AsyncMock()
    licence_repository.find_by_member_id.return_value = list(licences)
    licence_repository.update.side_effect = lambda lic: lic
    insurance_repository = AsyncMock()
    insurance_repository.find_by_member_id.return_value = list(insurances)
    insurance_repository.update.side_effect = lambda ins: ins
    return (
        UpdateMemberPaymentUseCase(member_payments, payments, licence_repository, insurance_repository),
        licence_repository,
        insurance_repository,
    )


async def test_moving_a_licence_line_moves_its_licence():
    dan, other_payment = licence(LicenseType.DAN), licence(LicenseType.DAN, payment_id="payment-other")
    uc, licences, _ = use_case(line(MemberPaymentType.LICENCIA_DAN), licences=[dan, other_payment])

    await uc.execute("mp-1", payment_year=2027)

    moved = licences.update.call_args.args[0]
    assert licences.update.await_count == 1
    assert (moved.id, moved.issue_date, moved.expiration_date) == (
        dan.id, datetime(2027, 1, 1), datetime(2027, 12, 31, 23, 59, 59)
    )


async def test_moving_an_insurance_line_moves_its_insurance():
    accident, rc = insurance(InsuranceType.ACCIDENT), insurance(InsuranceType.CIVIL_LIABILITY)
    uc, _, insurances = use_case(line(MemberPaymentType.SEGURO_ACCIDENTES), insurances=[accident, rc])

    await uc.execute("mp-1", payment_year=2027)

    moved = insurances.update.call_args.args[0]
    assert insurances.update.await_count == 1
    assert (moved.insurance_type, (moved.start_date, moved.end_date)) == (InsuranceType.ACCIDENT, insurance_season(2027))


async def test_moving_a_title_line_moves_its_licence_and_its_rc():
    uc, licences, insurances = use_case(
        line(MemberPaymentType.TITULO_SHIDOIN),
        licences=[licence(LicenseType.INSTRUCTOR)],
        insurances=[insurance(InsuranceType.CIVIL_LIABILITY)],
    )

    await uc.execute("mp-1", payment_year=2027)

    assert licences.update.call_args.args[0].expiration_date == datetime(2027, 12, 31, 23, 59, 59)
    assert (insurances.update.call_args.args[0].start_date, insurances.update.call_args.args[0].end_date) == insurance_season(2027)


async def test_moving_a_line_without_a_generated_record_changes_only_the_line():
    uc, licences, insurances = use_case(line(MemberPaymentType.LICENCIA_KYU))

    updated = await uc.execute("mp-1", payment_year=2027)

    assert updated.payment_year == 2027
    licences.update.assert_not_called()
    insurances.update.assert_not_called()


async def test_editing_the_amount_leaves_the_licence_alone():
    uc, licences, _ = use_case(line(MemberPaymentType.LICENCIA_DAN), licences=[licence(LicenseType.DAN)])

    await uc.execute("mp-1", amount=25)

    licences.find_by_member_id.assert_not_called()


async def test_a_renewed_licence_that_lasts_longer_is_not_shortened():
    renewed = licence(LicenseType.DAN)
    renewed.issue_date, renewed.expiration_date = datetime(2023, 1, 1), datetime(2028, 12, 31, 23, 59, 59)
    uc, licences, _ = use_case(line(MemberPaymentType.LICENCIA_DAN), licences=[renewed])

    await uc.execute("mp-1", payment_year=2025)

    licences.update.assert_not_called()


async def test_an_insurance_is_not_moved_onto_a_season_already_covered():
    start, end = insurance_season(2027)
    already = insurance(InsuranceType.CIVIL_LIABILITY)
    already.id, already.payment_id, already.start_date, already.end_date = "insurance-other", "payment-other", start, end
    uc, _, insurances = use_case(
        line(MemberPaymentType.TITULO_SHIDOIN), insurances=[insurance(InsuranceType.CIVIL_LIABILITY), already]
    )

    await uc.execute("mp-1", payment_year=2027)

    insurances.update.assert_not_called()
