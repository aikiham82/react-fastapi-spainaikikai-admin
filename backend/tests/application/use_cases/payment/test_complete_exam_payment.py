"""The bank confirms a card exam payment: one exam line, an invoice, nothing else."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.payment.complete_payment_use_case import CompletePaymentUseCase
from src.domain.entities.member import Member
from src.domain.entities.member_payment import MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]

DESCRIPTION = "Examen 2.º Dan · 14/11/2026 · Madrid"


def exam_payment() -> Payment:
    return Payment(
        id="pay-exam", member_id="m1", club_id="club1", payment_type=PaymentType.EXAM_FEE,
        payment_method=PaymentMethod.REDSYS, amount=175, status=PaymentStatus.COMPLETED, payment_year=2026,
        line_items_data=json.dumps([{
            "item_type": "examen_dan_2", "description": DESCRIPTION, "quantity": 1, "unit_price": 175, "total": 175,
        }]),
        member_assignments=json.dumps([{"member_id": "m1", "member_name": "Lucía Prueba", "payment_types": ["examen_dan_2"]}]),
    )


@pytest.fixture
def repos():
    payment_repo = MagicMock()
    payment_repo.claim_unfinished = AsyncMock(return_value=True)
    payment_repo.update = AsyncMock(side_effect=lambda payment: payment)
    member_payment_repo = MagicMock()
    member_payment_repo.create_bulk = AsyncMock(side_effect=lambda lines: lines)
    invoice_repo = MagicMock()
    invoice_repo.get_next_invoice_number = AsyncMock(return_value="2026-000009")
    invoice_repo.create = AsyncMock(side_effect=lambda invoice: invoice)
    member_repo = MagicMock()
    member_repo.find_by_id = AsyncMock(return_value=Member(id="m1", first_name="Lucía", last_name="Prueba", club_id="club1"))
    license_repo = MagicMock()
    license_repo.create = AsyncMock()
    insurance_repo = MagicMock()
    insurance_repo.create = AsyncMock()
    return {
        "payment": payment_repo, "member_payment": member_payment_repo, "invoice": invoice_repo,
        "member": member_repo, "license": license_repo, "insurance": insurance_repo,
    }


async def _complete(repos):
    return await CompletePaymentUseCase(
        payment_repository=repos["payment"],
        invoice_repository=repos["invoice"],
        member_repository=repos["member"],
        member_payment_repository=repos["member_payment"],
        license_repository=repos["license"],
        insurance_repository=repos["insurance"],
        price_configuration_repository=MagicMock(),
    ).execute(exam_payment())


async def test_the_exam_line_carries_the_paid_price_and_the_exam(repos):
    await _complete(repos)

    [line] = repos["member_payment"].create_bulk.await_args.args[0]
    assert line.payment_type == MemberPaymentType.EXAMEN_DAN_2
    assert line.amount == 175
    assert line.member_id == "m1"
    assert line.payment_year == 2026
    assert line.concept == DESCRIPTION
    assert line.status == MemberPaymentStatus.COMPLETED


async def test_an_exam_payment_creates_no_licence_or_insurance(repos):
    await _complete(repos)

    repos["license"].create.assert_not_called()
    repos["insurance"].create.assert_not_called()


async def test_an_exam_payment_gets_an_invoice_with_its_line(repos):
    result = await _complete(repos)

    [line] = result.invoice.line_items
    assert line.description == DESCRIPTION
    assert result.invoice.total > 0
