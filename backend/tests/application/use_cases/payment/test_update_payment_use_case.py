"""Tests for UpdatePaymentUseCase."""

import pytest
from unittest.mock import AsyncMock

from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    InvalidPaymentStatusError,
    InvalidPaymentDataError,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_payment_repo():
    """AsyncMock for PaymentRepositoryPort."""
    repo = AsyncMock()
    # Default: update returns the same payment it receives
    repo.update = AsyncMock(side_effect=lambda p: p)
    return repo


@pytest.fixture
def use_case(mock_payment_repo):
    """UpdatePaymentUseCase instance backed by mock repo."""
    from src.application.use_cases.payment.update_payment_use_case import UpdatePaymentUseCase
    return UpdatePaymentUseCase(payment_repository=mock_payment_repo)


def _make_payment(**kwargs) -> Payment:
    """Helper to build a Payment with sensible defaults."""
    defaults = dict(
        id="p1",
        club_id="c1",
        amount=100.0,
        payment_year=2025,
        payment_method=PaymentMethod.CASH,
        status=PaymentStatus.COMPLETED,
    )
    defaults.update(kwargs)
    return Payment(**defaults)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.asyncio
class TestUpdatePaymentUseCase:

    # --- happy path: CASH COMPLETED is editable ----------------------------

    async def test_manual_completed_payment_update_calls_repo_update(
        self, use_case, mock_payment_repo
    ):
        """A CASH/COMPLETED payment must be updated and repo.update called."""
        payment = _make_payment(payment_method=PaymentMethod.CASH, status=PaymentStatus.COMPLETED)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", amount=150.0, payer_name="New Name")

        mock_payment_repo.update.assert_called_once()

    async def test_manual_completed_payment_amount_is_changed(
        self, use_case, mock_payment_repo
    ):
        """Amount passed to execute must be reflected in the payment sent to update."""
        payment = _make_payment(payment_method=PaymentMethod.CASH, status=PaymentStatus.COMPLETED)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", amount=250.0)

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.amount == 250.0

    async def test_manual_completed_payment_payer_name_is_changed(
        self, use_case, mock_payment_repo
    ):
        """payer_name passed to execute must be reflected in the payment sent to update."""
        payment = _make_payment(payment_method=PaymentMethod.CASH, payer_name="Original")
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", payer_name="Updated Name")

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.payer_name == "Updated Name"

    async def test_transfer_pending_payment_is_editable(
        self, use_case, mock_payment_repo
    ):
        """A TRANSFER/PENDING payment is NOT blocked by the Redsys guard."""
        payment = _make_payment(
            payment_method=PaymentMethod.TRANSFER,
            status=PaymentStatus.PENDING,
        )
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", amount=99.0)

        mock_payment_repo.update.assert_called_once()

    async def test_payment_year_is_changed(self, use_case, mock_payment_repo):
        """payment_year update must be reflected in the payment sent to update."""
        payment = _make_payment(payment_year=2024)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", payment_year=2026)

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.payment_year == 2026

    async def test_payment_method_is_changed(self, use_case, mock_payment_repo):
        """payment_method string is coerced to enum and stored."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", payment_method="transfer")

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.payment_method == PaymentMethod.TRANSFER

    async def test_status_is_changed(self, use_case, mock_payment_repo):
        """status string is coerced to enum and stored."""
        payment = _make_payment(status=PaymentStatus.PENDING)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", status="completed")

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.status == PaymentStatus.COMPLETED

    async def test_updated_at_is_refreshed(self, use_case, mock_payment_repo):
        """updated_at must be set to the current UTC time."""
        from datetime import datetime

        payment = _make_payment()
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        before = datetime.utcnow()
        await use_case.execute("p1", payer_name="X")
        after = datetime.utcnow()

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.updated_at is not None
        assert before <= updated.updated_at <= after

    async def test_no_fields_provided_still_calls_update(
        self, use_case, mock_payment_repo
    ):
        """Calling execute with no field changes must still call update (sets updated_at)."""
        payment = _make_payment()
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1")

        mock_payment_repo.update.assert_called_once()

    # --- Redsys COMPLETED guard -------------------------------------------

    async def test_redsys_completed_raises_invalid_payment_status_error(
        self, use_case, mock_payment_repo
    ):
        """Redsys + COMPLETED = read-only: must raise InvalidPaymentStatusError."""
        payment = _make_payment(
            payment_method=PaymentMethod.REDSYS,
            status=PaymentStatus.COMPLETED,
        )
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("p1", amount=200.0)

    async def test_redsys_completed_does_not_call_update(
        self, use_case, mock_payment_repo
    ):
        """When the guard fires, repo.update must NOT be called."""
        payment = _make_payment(
            payment_method=PaymentMethod.REDSYS,
            status=PaymentStatus.COMPLETED,
        )
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("p1", amount=200.0)

        mock_payment_repo.update.assert_not_called()

    async def test_redsys_pending_is_editable(self, use_case, mock_payment_repo):
        """Redsys + PENDING is NOT blocked (guard only fires for COMPLETED)."""
        payment = _make_payment(
            payment_method=PaymentMethod.REDSYS,
            status=PaymentStatus.PENDING,
        )
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", amount=50.0)

        mock_payment_repo.update.assert_called_once()

    # --- not found ---------------------------------------------------------

    async def test_nonexistent_payment_raises_payment_not_found_error(
        self, use_case, mock_payment_repo
    ):
        """When find_by_id returns None, must raise PaymentNotFoundError."""
        mock_payment_repo.find_by_id = AsyncMock(return_value=None)

        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("does_not_exist", amount=50.0)

    async def test_nonexistent_payment_does_not_call_update(
        self, use_case, mock_payment_repo
    ):
        """PaymentNotFoundError path must not call update."""
        mock_payment_repo.find_by_id = AsyncMock(return_value=None)

        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("does_not_exist")

        mock_payment_repo.update.assert_not_called()

    # --- validation errors -------------------------------------------------

    async def test_negative_amount_raises_invalid_payment_data_error(
        self, use_case, mock_payment_repo
    ):
        """amount < 0 must raise InvalidPaymentDataError."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("p1", amount=-10.0)

    async def test_zero_amount_is_valid(self, use_case, mock_payment_repo):
        """amount == 0 is allowed (>= 0 rule)."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        await use_case.execute("p1", amount=0.0)

        updated: Payment = mock_payment_repo.update.call_args[0][0]
        assert updated.amount == 0.0

    async def test_payment_year_below_1900_raises_invalid_payment_data_error(
        self, use_case, mock_payment_repo
    ):
        """payment_year < 1900 must raise InvalidPaymentDataError."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("p1", payment_year=1899)

    async def test_payment_year_above_2100_raises_invalid_payment_data_error(
        self, use_case, mock_payment_repo
    ):
        """payment_year > 2100 must raise InvalidPaymentDataError."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("p1", payment_year=2101)

    async def test_invalid_payment_method_raises_invalid_payment_data_error(
        self, use_case, mock_payment_repo
    ):
        """An unrecognised payment_method string must raise InvalidPaymentDataError."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("p1", payment_method="bitcoin")

    async def test_invalid_status_raises_invalid_payment_data_error(
        self, use_case, mock_payment_repo
    ):
        """An unrecognised status string must raise InvalidPaymentDataError."""
        payment = _make_payment(payment_method=PaymentMethod.CASH)
        mock_payment_repo.find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("p1", status="flying")
