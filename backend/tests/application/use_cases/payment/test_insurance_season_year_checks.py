"""Insurance duplicate checks and paid marks compare by the season in force, not the form year."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.payment.initiate_annual_payment_use_case import (
    InitiateAnnualPaymentUseCase,
    MemberAssignment,
)
from src.application.use_cases.payment.prefill_annual_payment_use_case import (
    PrefillAnnualPaymentUseCase,
)
from src.domain.entities.member import Member, MemberStatus
from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)

AUTUMN_2026 = datetime(2026, 10, 20, 10, 0, 0)


def _paid(member_id, payment_type, year):
    return MemberPayment(
        id=f"mp-{payment_type.value}-{year}",
        payment_id="payment-1",
        member_id=member_id,
        payment_year=year,
        payment_type=payment_type,
        concept=payment_type.value,
        amount=20.0,
        status=MemberPaymentStatus.COMPLETED,
    )


def _member_payment_repo(by_year):
    repo = AsyncMock()

    async def find_by_member_ids_year(member_ids, payment_year, status=None, limit=0):
        return by_year.get(payment_year, [])

    repo.find_by_member_ids_year.side_effect = find_by_member_ids_year
    return repo


def _initiate_use_case(by_year):
    price_repository = AsyncMock()

    async def find_by_keys(keys):
        return [MagicMock(key=k, price=20.0, description=k) for k in keys]

    price_repository.find_by_keys.side_effect = find_by_keys
    payment_repository = AsyncMock()

    async def create(payment):
        payment.id = "payment-new"
        return payment

    payment_repository.create.side_effect = create
    redsys_service = MagicMock()
    redsys_service.generate_order_id.return_value = "order-1"
    redsys_service.create_payment_form_data = AsyncMock(return_value=MagicMock())
    return InitiateAnnualPaymentUseCase(
        payment_repository=payment_repository,
        redsys_service=redsys_service,
        price_repository=price_repository,
        member_payment_repository=_member_payment_repo(by_year),
        clock=lambda: AUTUMN_2026,
    )


async def _renew_accident_insurance(use_case):
    return await use_case.execute(
        payer_name="Example Club",
        club_id="club-1",
        payment_year=2026,
        seguro_accidentes_count=1,
        member_assignments=[MemberAssignment("member-1", "Ana Example", ["seguro_accidentes"])],
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_insurance_of_the_expired_season_does_not_block_an_autumn_renewal():
    use_case = _initiate_use_case(
        {2026: [_paid("member-1", MemberPaymentType.SEGURO_ACCIDENTES, 2026)]}
    )

    result = await _renew_accident_insurance(use_case)

    assert result.total_amount == 20.0


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_insurance_of_the_current_season_blocks_a_new_one():
    use_case = _initiate_use_case(
        {2027: [_paid("member-1", MemberPaymentType.SEGURO_ACCIDENTES, 2027)]}
    )

    with pytest.raises(ValueError, match="ya tienen pagos completados"):
        await _renew_accident_insurance(use_case)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_paid_insurances_are_marked_by_the_current_season_year():
    member_repository = AsyncMock()
    member_repository.find_by_club_id.return_value = [
        Member(id="member-1", first_name="Ana", last_name="Example", status=MemberStatus.ACTIVE, club_id="club-1"),
    ]
    license_repository = AsyncMock()
    license_repository.find_by_member_ids.return_value = []
    insurance_repository = AsyncMock()
    insurance_repository.find_by_member_ids.return_value = []
    use_case = PrefillAnnualPaymentUseCase(
        member_repository,
        license_repository,
        insurance_repository,
        AsyncMock(),
        _member_payment_repo({
            2026: [
                _paid("member-1", MemberPaymentType.SEGURO_ACCIDENTES, 2026),
                _paid("member-1", MemberPaymentType.LICENCIA_KYU, 2026),
            ],
            2027: [_paid("member-1", MemberPaymentType.SEGURO_RC, 2027)],
        }),
        clock=lambda: AUTUMN_2026,
    )

    result = await use_case.execute("club-1", 2026)

    assert result.paid_assignments[0].payment_types == ["kyu", "seguro_rc"]
