"""Invoice creation in ProcessRedsysWebhookUseCase for a club annual payment."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.domain.entities.invoice import InvoiceStatus
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.use_cases.payment.process_redsys_webhook_use_case import (
    ProcessRedsysWebhookUseCase,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_club_annual_payment_without_member_gets_an_invoice():
    invoice_repository = MagicMock()
    invoice_repository.get_next_invoice_number = AsyncMock(return_value="2026-000001")
    invoice_repository.create = AsyncMock(side_effect=lambda invoice: invoice)
    use_case = ProcessRedsysWebhookUseCase(
        payment_repository=MagicMock(),
        redsys_service=MagicMock(),
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
