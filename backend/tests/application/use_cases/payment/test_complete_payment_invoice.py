"""Invoice creation in CompletePaymentUseCase for a club annual payment."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.domain.entities.invoice import InvoiceStatus
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.use_cases.payment.complete_payment_use_case import (
    CompletePaymentUseCase,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_club_annual_payment_without_member_gets_an_invoice():
    invoice_repository = MagicMock()
    invoice_repository.get_next_invoice_number = AsyncMock(return_value="2026-000001")
    invoice_repository.create = AsyncMock(side_effect=lambda invoice: invoice)
    use_case = CompletePaymentUseCase(
        payment_repository=MagicMock(),
        invoice_repository=invoice_repository,
        member_repository=MagicMock(),
    )
    payment = Payment(
        id="pay1",
        club_id="club1",
        payment_type=PaymentType.ANNUAL_QUOTA,
        amount=60.0,
        status=PaymentStatus.COMPLETED,
        related_entity_id="club1",
        payment_year=2026,
        payer_name="Example Dojo",
        line_items_data=json.dumps([
            {"description": "Seguro de Accidentes", "quantity": 6, "unit_price": 10.0},
        ]),
    )

    invoice = await use_case._create_invoice(payment)

    assert invoice.member_id == "club1"
    assert invoice.club_id == "club1"
    assert invoice.status == InvoiceStatus.ISSUED
    assert invoice.total == 60.0
    assert invoice.issue_date.tzinfo is None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_member_payment_gets_an_invoice_in_the_members_name():
    from src.domain.entities.member import Member

    invoice_repository = MagicMock()
    invoice_repository.get_next_invoice_number = AsyncMock(return_value="2026-000002")
    invoice_repository.create = AsyncMock(side_effect=lambda invoice: invoice)
    member_repository = MagicMock()
    member_repository.find_by_id = AsyncMock(return_value=Member(
        id="m1", first_name="Ana", last_name="Example", email="ana@example.com",
    ))
    use_case = CompletePaymentUseCase(
        payment_repository=MagicMock(),
        invoice_repository=invoice_repository,
        member_repository=member_repository,
    )
    payment = Payment(
        id="pay2", member_id="m1", club_id="club1", payment_type=PaymentType.LICENSE,
        amount=20.0, status=PaymentStatus.COMPLETED, payment_year=2026,
    )

    invoice = await use_case._create_invoice(payment)

    assert invoice.customer_name == "Ana Example"
    assert invoice.customer_email == "ana@example.com"
    assert invoice.payment_method == "redsys"
