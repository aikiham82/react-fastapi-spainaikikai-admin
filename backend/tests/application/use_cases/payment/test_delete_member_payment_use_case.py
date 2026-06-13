"""Tests for DeleteMemberPaymentUseCase."""

import pytest
from unittest.mock import AsyncMock

from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import MemberPaymentNotFoundError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mp(
    mp_id: str,
    payment_id: str,
    amount: float,
    status: MemberPaymentStatus = MemberPaymentStatus.COMPLETED,
) -> MemberPayment:
    """Build a MemberPayment with sensible defaults."""
    return MemberPayment(
        id=mp_id,
        payment_id=payment_id,
        member_id="member-1",
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="licencia_kyu - 2026",
        amount=amount,
        status=status,
    )


def _make_parent_payment(payment_id: str, amount: float = 100.0) -> Payment:
    """Build a Payment entity with sensible defaults."""
    return Payment(
        id=payment_id,
        club_id="club-1",
        amount=amount,
        payment_year=2026,
        payment_method=PaymentMethod.CASH,
        status=PaymentStatus.COMPLETED,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_repos():
    """AsyncMock instances for both repository ports."""
    return {
        "mp_repo": AsyncMock(),
        "payment_repo": AsyncMock(),
    }


@pytest.fixture
def use_case(mock_repos):
    """DeleteMemberPaymentUseCase backed by mock repos."""
    from src.application.use_cases.payment.delete_member_payment_use_case import (
        DeleteMemberPaymentUseCase,
    )

    return DeleteMemberPaymentUseCase(
        member_payment_repository=mock_repos["mp_repo"],
        payment_repository=mock_repos["payment_repo"],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.unit
@pytest.mark.asyncio
class TestDeleteMemberPaymentUseCase:

    # --- happy path: delete recomputes parent amount -----------------------

    async def test_delete_recomputes_parent_amount(self, use_case, mock_repos):
        """After deleting a line, parent Payment.amount = sum of remaining COMPLETED lines.

        Setup: delete mp1 (50.0 COMPLETED).
        Remaining lines: mp2 (30.0 COMPLETED) + mp3 (20.0 REFUNDED).
        Expected parent.amount = 30.0 (only COMPLETED counted).
        """
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 50.0, MemberPaymentStatus.COMPLETED)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        # Remaining lines after deletion (mp1 already gone)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(
            return_value=[
                _make_mp("mp2", "pay1", 30.0, MemberPaymentStatus.COMPLETED),
                _make_mp("mp3", "pay1", 20.0, MemberPaymentStatus.REFUNDED),
            ]
        )
        parent = _make_parent_payment("pay1", amount=100.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        result = await use_case.execute("mp1")

        assert result is True
        mock_repos["payment_repo"].update.assert_called_once()
        updated_parent: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert updated_parent.amount == 30.0  # 30 COMPLETED only (20 REFUNDED excluded)

    async def test_delete_recomputes_parent_amount_all_remaining_completed(
        self, use_case, mock_repos
    ):
        """When all remaining lines are COMPLETED, parent.amount = their full sum."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 40.0, MemberPaymentStatus.COMPLETED)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(
            return_value=[
                _make_mp("mp2", "pay1", 60.0, MemberPaymentStatus.COMPLETED),
                _make_mp("mp3", "pay1", 25.0, MemberPaymentStatus.COMPLETED),
            ]
        )
        parent = _make_parent_payment("pay1", amount=125.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        result = await use_case.execute("mp1")

        assert result is True
        updated_parent: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert updated_parent.amount == 85.0  # 60 + 25

    async def test_delete_last_line_recomputes_parent_to_zero(self, use_case, mock_repos):
        """When the last line is deleted, parent.amount is recomputed to 0."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 80.0, MemberPaymentStatus.COMPLETED)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        # No remaining lines after deletion
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        parent = _make_parent_payment("pay1", amount=80.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        result = await use_case.execute("mp1")

        assert result is True
        updated_parent: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert updated_parent.amount == 0.0

    # --- not found ---------------------------------------------------------

    async def test_not_found_raises(self, use_case, mock_repos):
        """When find_by_id returns None, must raise MemberPaymentNotFoundError."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("nonexistent")

    async def test_not_found_does_not_call_delete(self, use_case, mock_repos):
        """MemberPaymentNotFoundError path must not call mp_repo.delete."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("nonexistent")

        mock_repos["mp_repo"].delete.assert_not_called()

    # --- delete returns False: no recompute --------------------------------

    async def test_delete_returns_false_skips_recompute(self, use_case, mock_repos):
        """When mp_repo.delete returns False, recompute must NOT be performed."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 50.0)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=False)

        result = await use_case.execute("mp1")

        assert result is False
        mock_repos["mp_repo"].find_by_payment_id.assert_not_called()
        mock_repos["payment_repo"].find_by_id.assert_not_called()
        mock_repos["payment_repo"].update.assert_not_called()

    # --- recompute skips update when parent not found ----------------------

    async def test_recompute_skips_update_if_parent_not_found(self, use_case, mock_repos):
        """If parent Payment does not exist, recompute must be a no-op (no raise)."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 50.0)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)
        mock_repos["payment_repo"].update = AsyncMock()

        # Must NOT raise even when parent is missing
        result = await use_case.execute("mp1")

        assert result is True
        mock_repos["payment_repo"].update.assert_not_called()

    # --- returns the bool from delete --------------------------------------

    async def test_returns_true_on_successful_delete(self, use_case, mock_repos):
        """execute must return True when delete succeeds."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 50.0)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        result = await use_case.execute("mp1")

        assert result is True

    async def test_delete_calls_delete_with_correct_id(self, use_case, mock_repos):
        """mp_repo.delete must be called with the given member_payment_id."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay1", 50.0)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1")

        mock_repos["mp_repo"].delete.assert_called_once_with("mp1")

    async def test_recompute_queries_correct_payment_id(self, use_case, mock_repos):
        """find_by_payment_id must be called with the payment_id from the deleted line."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(
            return_value=_make_mp("mp1", "pay-xyz", 50.0)
        )
        mock_repos["mp_repo"].delete = AsyncMock(return_value=True)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        parent = _make_parent_payment("pay-xyz")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1")

        mock_repos["mp_repo"].find_by_payment_id.assert_called_once_with("pay-xyz")
