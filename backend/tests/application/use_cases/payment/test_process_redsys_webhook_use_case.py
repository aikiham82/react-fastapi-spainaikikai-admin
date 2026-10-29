"""A Redsys notification for a payment that is already completed."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.payment.process_redsys_webhook_use_case import ProcessRedsysWebhookUseCase
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_late_success_for_a_payment_confirmed_offline_is_acknowledged_without_fulfilling_it_again():
    payment = Payment(
        id="pay1", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA,
        payment_method=PaymentMethod.TRANSFER, amount=20.0, status=PaymentStatus.COMPLETED,
        transaction_id="QA0000000001", payment_year=2026,
    )
    payment_repository = MagicMock()
    payment_repository.find_by_transaction_id = AsyncMock(return_value=payment)
    payment_repository.update = AsyncMock()
    redsys_service = MagicMock()
    redsys_service.verify_notification_signature = AsyncMock(return_value=True)
    redsys_service.parse_notification = AsyncMock(return_value=MagicMock(
        order_id="QA0000000001", is_successful=True, response_code="0000",
    ))
    invoice_repository = MagicMock()
    invoice_repository.create = AsyncMock()
    use_case = ProcessRedsysWebhookUseCase(
        payment_repository=payment_repository,
        redsys_service=redsys_service,
        invoice_repository=invoice_repository,
        member_repository=MagicMock(),
    )

    result = await use_case.execute("signature", "parameters", "HMAC_SHA256_V1")

    assert result.success
    assert result.payment.payment_method == PaymentMethod.TRANSFER
    payment_repository.update.assert_not_called()
    invoice_repository.create.assert_not_called()
