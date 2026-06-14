"""Tests for UpdateMemberPaymentUseCase."""

import pytest
from unittest.mock import AsyncMock

from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import (
    MemberPaymentNotFoundError,
    InvalidPaymentDataError,
)


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
    """UpdateMemberPaymentUseCase backed by mock repos."""
    from src.application.use_cases.payment.update_member_payment_use_case import (
        UpdateMemberPaymentUseCase,
    )

    return UpdateMemberPaymentUseCase(
        member_payment_repository=mock_repos["mp_repo"],
        payment_repository=mock_repos["payment_repo"],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.unit
@pytest.mark.asyncio
class TestUpdateMemberPaymentUseCase:

    # --- happy path: update fields -----------------------------------------

    async def test_updates_amount_and_calls_repo_update(self, use_case, mock_repos):
        """Updated amount must be reflected in the object passed to mp_repo.update."""
        original = _make_mp("mp1", "pay1", 50.0)
        updated = _make_mp("mp1", "pay1", 75.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[updated])
        parent = _make_parent_payment("pay1", 50.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", amount=75.0)

        mock_repos["mp_repo"].update.assert_called_once()
        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.amount == 75.0

    async def test_updates_concept(self, use_case, mock_repos):
        """Updated concept must be in the object passed to mp_repo.update."""
        original = _make_mp("mp1", "pay1", 50.0)
        updated = _make_mp("mp1", "pay1", 50.0)
        updated.concept = "Nuevo concepto"
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[updated])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", concept="Nuevo concepto")

        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.concept == "Nuevo concepto"

    async def test_updates_status_to_refunded(self, use_case, mock_repos):
        """Status string 'refunded' must be coerced to MemberPaymentStatus.REFUNDED."""
        original = _make_mp("mp1", "pay1", 50.0)
        refunded = _make_mp("mp1", "pay1", 50.0, status=MemberPaymentStatus.REFUNDED)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=refunded)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[refunded])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", status="refunded")

        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.status == MemberPaymentStatus.REFUNDED

    async def test_updates_payment_type(self, use_case, mock_repos):
        """payment_type string must be coerced to MemberPaymentType enum."""
        original = _make_mp("mp1", "pay1", 50.0)
        updated = _make_mp("mp1", "pay1", 50.0)
        updated.payment_type = MemberPaymentType.LICENCIA_DAN
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[updated])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", payment_type="licencia_dan")

        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.payment_type == MemberPaymentType.LICENCIA_DAN

    async def test_updated_at_is_refreshed(self, use_case, mock_repos):
        """updated_at must be set to the current UTC time."""
        from datetime import datetime

        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=original)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[original])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        before = datetime.utcnow()
        await use_case.execute("mp1", amount=50.0)
        after = datetime.utcnow()

        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.updated_at is not None
        assert before <= call_arg.updated_at <= after

    # --- KEY test: recompute uses COMPLETED lines only ---------------------

    async def test_recomputes_parent_amount_from_completed_lines_only(
        self, use_case, mock_repos
    ):
        """Parent Payment.amount must equal the sum of COMPLETED lines only.

        Setup: 2 COMPLETED (75 + 30) + 1 REFUNDED (20) -> parent.amount = 105.
        """
        original = _make_mp("mp1", "pay1", 50.0)
        updated_mp = _make_mp("mp1", "pay1", 75.0, status=MemberPaymentStatus.COMPLETED)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated_mp)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(
            return_value=[
                _make_mp("mp1", "pay1", 75.0, status=MemberPaymentStatus.COMPLETED),
                _make_mp("mp2", "pay1", 30.0, status=MemberPaymentStatus.COMPLETED),
                _make_mp("mp3", "pay1", 20.0, status=MemberPaymentStatus.REFUNDED),
            ]
        )
        parent = _make_parent_payment("pay1", amount=100.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", amount=75.0)

        # payment_repo.update must have been called with the recomputed amount
        mock_repos["payment_repo"].update.assert_called_once()
        update_call_arg: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert update_call_arg.amount == 105.0  # 75 + 30 only (REFUNDED excluded)

    async def test_recompute_excludes_pending_lines(self, use_case, mock_repos):
        """PENDING lines must also be excluded from the parent amount recompute."""
        original = _make_mp("mp1", "pay1", 60.0)
        updated_mp = _make_mp("mp1", "pay1", 60.0, status=MemberPaymentStatus.COMPLETED)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated_mp)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(
            return_value=[
                _make_mp("mp1", "pay1", 60.0, status=MemberPaymentStatus.COMPLETED),
                _make_mp("mp2", "pay1", 40.0, status=MemberPaymentStatus.PENDING),
            ]
        )
        parent = _make_parent_payment("pay1", amount=100.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", amount=60.0)

        update_call_arg: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert update_call_arg.amount == 60.0  # only COMPLETED line

    async def test_recompute_with_all_refunded_yields_zero(self, use_case, mock_repos):
        """When all lines are REFUNDED, parent.amount must be set to 0."""
        original = _make_mp("mp1", "pay1", 50.0)
        refunded_mp = _make_mp("mp1", "pay1", 50.0, status=MemberPaymentStatus.REFUNDED)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=refunded_mp)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(
            return_value=[
                _make_mp("mp1", "pay1", 50.0, status=MemberPaymentStatus.REFUNDED),
                _make_mp("mp2", "pay1", 30.0, status=MemberPaymentStatus.REFUNDED),
            ]
        )
        parent = _make_parent_payment("pay1", amount=80.0)
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", status="refunded")

        update_call_arg: Payment = mock_repos["payment_repo"].update.call_args[0][0]
        assert update_call_arg.amount == 0.0

    async def test_recompute_calls_payment_repo_update(self, use_case, mock_repos):
        """payment_repo.update must always be called after a successful mp update."""
        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=original)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[original])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", concept="test")

        mock_repos["payment_repo"].update.assert_called_once()

    async def test_recompute_skips_payment_update_if_parent_not_found(
        self, use_case, mock_repos
    ):
        """If parent Payment does not exist, recompute must be a no-op (no raise)."""
        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=original)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[original])
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)
        mock_repos["payment_repo"].update = AsyncMock()

        # Must NOT raise even when parent is missing
        result = await use_case.execute("mp1", concept="test")

        mock_repos["payment_repo"].update.assert_not_called()
        assert result is not None

    # --- not found ---------------------------------------------------------

    async def test_raises_member_payment_not_found_error(self, use_case, mock_repos):
        """When find_by_id returns None, must raise MemberPaymentNotFoundError."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("does_not_exist", amount=50.0)

    async def test_not_found_does_not_call_update(self, use_case, mock_repos):
        """MemberPaymentNotFoundError path must not call mp_repo.update."""
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(MemberPaymentNotFoundError):
            await use_case.execute("does_not_exist")

        mock_repos["mp_repo"].update.assert_not_called()

    # --- validation errors -------------------------------------------------

    async def test_negative_amount_raises_invalid_payment_data_error(
        self, use_case, mock_repos
    ):
        """amount < 0 must raise InvalidPaymentDataError before calling update."""
        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("mp1", amount=-10.0)

        mock_repos["mp_repo"].update.assert_not_called()

    async def test_zero_amount_is_valid(self, use_case, mock_repos):
        """amount == 0 is allowed (>= 0 rule)."""
        original = _make_mp("mp1", "pay1", 50.0)
        zeroed = _make_mp("mp1", "pay1", 0.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=zeroed)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[zeroed])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        await use_case.execute("mp1", amount=0.0)

        call_arg: MemberPayment = mock_repos["mp_repo"].update.call_args[0][0]
        assert call_arg.amount == 0.0

    async def test_invalid_payment_type_raises_invalid_payment_data_error(
        self, use_case, mock_repos
    ):
        """An unrecognised payment_type string must raise InvalidPaymentDataError."""
        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("mp1", payment_type="flying_kick")

        mock_repos["mp_repo"].update.assert_not_called()

    async def test_invalid_status_raises_invalid_payment_data_error(
        self, use_case, mock_repos
    ):
        """An unrecognised status string must raise InvalidPaymentDataError."""
        original = _make_mp("mp1", "pay1", 50.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("mp1", status="flying")

        mock_repos["mp_repo"].update.assert_not_called()

    # --- returns the updated MemberPayment ---------------------------------

    async def test_returns_updated_member_payment(self, use_case, mock_repos):
        """execute must return the MemberPayment returned by mp_repo.update."""
        original = _make_mp("mp1", "pay1", 50.0)
        updated = _make_mp("mp1", "pay1", 99.0)
        mock_repos["mp_repo"].find_by_id = AsyncMock(return_value=original)
        mock_repos["mp_repo"].update = AsyncMock(return_value=updated)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[updated])
        parent = _make_parent_payment("pay1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=parent)
        mock_repos["payment_repo"].update = AsyncMock(return_value=parent)

        result = await use_case.execute("mp1", amount=99.0)

        assert result is updated
