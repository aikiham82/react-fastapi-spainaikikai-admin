"""A refund above the amount is a clear refusal, not an internal error."""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.app import create_app
from src.application.use_cases.payment.refund_payment_use_case import RefundPaymentUseCase
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import InvalidRefundAmountError
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_member_repository,
    get_payment_repository,
    get_refund_payment_use_case,
)
from tests.api.callers import super_admin

pytestmark = [pytest.mark.unit]


def completed_payment() -> Payment:
    return Payment(
        id="payment-1", club_id="club-dojo", amount=30.0, payment_year=2026,
        payment_method=PaymentMethod.CASH, status=PaymentStatus.COMPLETED,
    )


def repository() -> AsyncMock:
    return AsyncMock(
        find_by_id=AsyncMock(return_value=completed_payment()),
        update=AsyncMock(side_effect=lambda saved: saved),
    )


async def test_a_refund_above_the_amount_is_refused_and_not_saved():
    payments = repository()

    with pytest.raises(InvalidRefundAmountError, match="no puede superar el importe"):
        await RefundPaymentUseCase(payments).execute("payment-1", 30.01)

    payments.update.assert_not_called()


@pytest.mark.parametrize(
    ("requested", "refunded"), [(30.0, 30.0), (10.0, 10.0), (None, 30.0)], ids=["whole", "part", "not-said"]
)
async def test_a_refund_within_the_amount_is_saved(requested, refunded):
    saved = await RefundPaymentUseCase(repository()).execute("payment-1", requested)

    assert saved.refund_amount == refunded


@pytest.mark.parametrize("amount", [0, -5], ids=["zero", "negative"])
async def test_a_refund_of_nothing_never_refunds_the_whole_payment(amount):
    payments = repository()

    with pytest.raises(InvalidRefundAmountError, match="mayor que cero"):
        await RefundPaymentUseCase(payments).execute("payment-1", amount)

    payments.update.assert_not_called()


def test_the_route_answers_400():
    payments = repository()
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_payment_repository: lambda: payments,
        get_member_repository: lambda: AsyncMock(),
        get_refund_payment_use_case: lambda: RefundPaymentUseCase(payments),
    }

    response = TestClient(app, raise_server_exceptions=False).put(
        "/api/v1/payments/payment-1/refund", json={"refund_amount": 999}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "El reembolso no puede superar el importe del pago"
