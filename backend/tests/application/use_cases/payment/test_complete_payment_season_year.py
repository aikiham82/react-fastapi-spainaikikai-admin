"""Insurance member payments record the year of the season they cover."""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.payment.complete_payment_use_case import (
    CompletePaymentUseCase,
)
from src.domain.entities.member_payment import MemberPaymentType
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType


def _use_case():
    member_repository = AsyncMock()
    member_repository.find_by_id.return_value = MagicMock(club_role="member")
    return CompletePaymentUseCase(
        payment_repository=MagicMock(),
        member_payment_repository=AsyncMock(),
        member_repository=member_repository,
    )


def _payment(form_year):
    return Payment(
        id="payment-1",
        club_id="club-1",
        payment_type=PaymentType.ANNUAL_QUOTA,
        amount=55.0,
        status=PaymentStatus.COMPLETED,
        payment_year=form_year,
        member_assignments=json.dumps([
            {"member_id": "member-1", "member_name": "Ana Example", "payment_types": ["kyu", "seguro_accidentes", "seguro_rc"]},
        ]),
    )


def _years_by_type(member_payments):
    return {mp.payment_type: mp.payment_year for mp in member_payments}


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_october_payment_records_insurance_in_the_next_season_year_and_licence_in_the_form_year():
    member_payments = await _use_case()._create_member_payments(
        _payment(form_year=2025), paid_at=datetime(2026, 10, 1, 0, 0, 0)
    )

    assert _years_by_type(member_payments) == {
        MemberPaymentType.LICENCIA_KYU: 2025,
        MemberPaymentType.SEGURO_ACCIDENTES: 2027,
        MemberPaymentType.SEGURO_RC: 2027,
    }


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_september_payment_records_insurance_in_the_form_year():
    member_payments = await _use_case()._create_member_payments(
        _payment(form_year=2026), paid_at=datetime(2026, 9, 30, 23, 59, 59)
    )

    assert _years_by_type(member_payments) == {
        MemberPaymentType.LICENCIA_KYU: 2026,
        MemberPaymentType.SEGURO_ACCIDENTES: 2026,
        MemberPaymentType.SEGURO_RC: 2026,
    }
