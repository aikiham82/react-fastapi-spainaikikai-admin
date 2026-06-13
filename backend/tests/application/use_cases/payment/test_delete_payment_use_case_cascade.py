"""Tests for DeletePaymentUseCase — cascade delete + force flag."""

import pytest
from unittest.mock import AsyncMock

from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.invoice import Invoice, InvoiceStatus
from src.domain.exceptions.payment import PaymentNotFoundError, InvalidPaymentStatusError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_payment(
    payment_id: str = "pay-1",
    method: PaymentMethod = PaymentMethod.CASH,
    status: PaymentStatus = PaymentStatus.COMPLETED,
) -> Payment:
    return Payment(
        id=payment_id,
        club_id="club-1",
        amount=100.0,
        payment_year=2026,
        payment_method=method,
        status=status,
    )


def _make_mp(mp_id: str, payment_id: str) -> MemberPayment:
    return MemberPayment(
        id=mp_id,
        payment_id=payment_id,
        member_id="member-1",
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="licencia_kyu - 2026",
        amount=50.0,
        status=MemberPaymentStatus.COMPLETED,
    )


def _make_invoice(invoice_id: str, payment_id: str) -> Invoice:
    return Invoice(
        id=invoice_id,
        invoice_number="2026-000001",
        payment_id=payment_id,
        member_id="member-1",
        status=InvoiceStatus.ISSUED,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_repos():
    """Return AsyncMock repo instances and a shared call-order recorder."""
    call_order: list = []

    payment_repo = AsyncMock()
    mp_repo = AsyncMock()
    invoice_repo = AsyncMock()

    # Track deletion call order via side-effect wrappers
    async def _mp_delete(mp_id: str) -> bool:
        call_order.append(f"mp_delete:{mp_id}")
        return True

    async def _invoice_delete(inv_id: str) -> bool:
        call_order.append(f"invoice_delete:{inv_id}")
        return True

    async def _payment_delete(pay_id: str) -> bool:
        call_order.append(f"payment_delete:{pay_id}")
        return True

    mp_repo.delete.side_effect = _mp_delete
    invoice_repo.delete.side_effect = _invoice_delete
    payment_repo.delete.side_effect = _payment_delete

    return {
        "payment_repo": payment_repo,
        "mp_repo": mp_repo,
        "invoice_repo": invoice_repo,
        "call_order": call_order,
    }


@pytest.fixture
def use_case(mock_repos):
    from src.application.use_cases.payment.delete_payment_use_case import DeletePaymentUseCase

    return DeletePaymentUseCase(
        payment_repository=mock_repos["payment_repo"],
        member_payment_repository=mock_repos["mp_repo"],
        invoice_repository=mock_repos["invoice_repo"],
    )


@pytest.fixture
def use_case_no_cascade(mock_repos):
    """DeletePaymentUseCase with only payment_repository (tests backward compat)."""
    from src.application.use_cases.payment.delete_payment_use_case import DeletePaymentUseCase

    return DeletePaymentUseCase(
        payment_repository=mock_repos["payment_repo"],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.unit
@pytest.mark.asyncio
class TestDeletePaymentUseCaseCascade:

    # --- cascade order -------------------------------------------------------

    async def test_cascade_deletes_in_correct_order(self, use_case, mock_repos):
        """MemberPayments deleted first, then Invoice, then Payment.

        Cascade order must be: mp1, mp2, invoice, payment.
        """
        payment = _make_payment("pay-1")
        mp1 = _make_mp("mp-1", "pay-1")
        mp2 = _make_mp("mp-2", "pay-1")
        invoice = _make_invoice("inv-1", "pay-1")

        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[mp1, mp2])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=invoice)

        await use_case.execute("pay-1")

        order = mock_repos["call_order"]

        # All four deletions must have occurred
        assert "mp_delete:mp-1" in order
        assert "mp_delete:mp-2" in order
        assert "invoice_delete:inv-1" in order
        assert "payment_delete:pay-1" in order

        # MemberPayment deletions must precede invoice deletion
        assert order.index("mp_delete:mp-1") < order.index("invoice_delete:inv-1")
        assert order.index("mp_delete:mp-2") < order.index("invoice_delete:inv-1")

        # Invoice deletion must precede payment deletion
        assert order.index("invoice_delete:inv-1") < order.index("payment_delete:pay-1")

    # --- Redsys COMPLETED + force guard -------------------------------------

    async def test_redsys_completed_without_force_raises(self, use_case, mock_repos):
        """Redsys COMPLETED without force=True must raise InvalidPaymentStatusError."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.REDSYS, status=PaymentStatus.COMPLETED
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("pay-1", force=False)

        mock_repos["payment_repo"].delete.assert_not_called()

    async def test_redsys_completed_without_force_does_not_cascade(self, use_case, mock_repos):
        """When guard raises, no cascade deletions must occur."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.REDSYS, status=PaymentStatus.COMPLETED
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)

        with pytest.raises(InvalidPaymentStatusError):
            await use_case.execute("pay-1", force=False)

        mock_repos["mp_repo"].find_by_payment_id.assert_not_called()
        mock_repos["invoice_repo"].find_by_payment_id.assert_not_called()

    async def test_redsys_completed_with_force_proceeds(self, use_case, mock_repos):
        """Redsys COMPLETED with force=True must not raise and must delete payment."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.REDSYS, status=PaymentStatus.COMPLETED
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)

        result = await use_case.execute("pay-1", force=True)

        assert result is True
        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")

    async def test_redsys_pending_without_force_proceeds(self, use_case, mock_repos):
        """Redsys PENDING (not COMPLETED) must succeed without force."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.REDSYS, status=PaymentStatus.PENDING
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)

        result = await use_case.execute("pay-1", force=False)

        assert result is True
        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")

    # --- Manual (non-Redsys) COMPLETED without force -------------------------

    async def test_manual_completed_without_force_succeeds(self, use_case, mock_repos):
        """CASH COMPLETED must succeed without force=True."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.CASH, status=PaymentStatus.COMPLETED
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)

        result = await use_case.execute("pay-1", force=False)

        assert result is True

    async def test_transfer_completed_without_force_succeeds(self, use_case, mock_repos):
        """TRANSFER COMPLETED must also succeed without force."""
        payment = _make_payment(
            "pay-1", method=PaymentMethod.TRANSFER, status=PaymentStatus.COMPLETED
        )
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=None)

        result = await use_case.execute("pay-1", force=False)

        assert result is True

    # --- Not found -----------------------------------------------------------

    async def test_not_found_raises(self, use_case, mock_repos):
        """When payment does not exist, must raise PaymentNotFoundError."""
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("nonexistent")

    async def test_not_found_does_not_cascade(self, use_case, mock_repos):
        """PaymentNotFoundError path must not trigger any cascade operations."""
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=None)

        with pytest.raises(PaymentNotFoundError):
            await use_case.execute("nonexistent")

        mock_repos["mp_repo"].find_by_payment_id.assert_not_called()
        mock_repos["invoice_repo"].find_by_payment_id.assert_not_called()
        mock_repos["payment_repo"].delete.assert_not_called()

    # --- Invoice lookup exception survival (Bug B) ---------------------------

    async def test_invoice_lookup_raises_cascade_still_deletes_payment(
        self, use_case, mock_repos
    ):
        """If invoice_repo.find_by_payment_id raises (adapter bug), cascade must continue."""
        payment = _make_payment("pay-1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(
            side_effect=TypeError("field name mismatch")
        )

        result = await use_case.execute("pay-1")

        # Invoice delete was NOT called (can't delete if lookup raised)
        mock_repos["invoice_repo"].delete.assert_not_called()
        # But payment was still deleted
        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")
        assert result is True

    async def test_invoice_delete_raises_cascade_still_deletes_payment(
        self, use_case, mock_repos
    ):
        """If invoice_repo.delete raises, cascade must survive and delete payment."""
        payment = _make_payment("pay-1")
        invoice = _make_invoice("inv-1", "pay-1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=invoice)
        # Override the tracked side effect with a raising one
        mock_repos["invoice_repo"].delete = AsyncMock(side_effect=RuntimeError("db error"))

        result = await use_case.execute("pay-1")

        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")
        assert result is True

    # --- No cascade repos (backward compatibility) ---------------------------

    async def test_without_cascade_repos_deletes_payment_only(
        self, use_case_no_cascade, mock_repos
    ):
        """When repos are None (old callers), must still delete payment without error."""
        payment = _make_payment("pay-1")
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)

        result = await use_case_no_cascade.execute("pay-1")

        assert result is True
        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")
        mock_repos["mp_repo"].find_by_payment_id.assert_not_called()
        mock_repos["invoice_repo"].find_by_payment_id.assert_not_called()

    # --- Invoice with no id --------------------------------------------------

    async def test_invoice_without_id_skips_delete(self, use_case, mock_repos):
        """Invoice with id=None must not trigger invoice_repo.delete."""
        payment = _make_payment("pay-1")
        invoice_no_id = Invoice(
            invoice_number="2026-000001",
            payment_id="pay-1",
            member_id="member-1",
            status=InvoiceStatus.ISSUED,
        )  # id=None by default
        mock_repos["payment_repo"].find_by_id = AsyncMock(return_value=payment)
        mock_repos["mp_repo"].find_by_payment_id = AsyncMock(return_value=[])
        mock_repos["invoice_repo"].find_by_payment_id = AsyncMock(return_value=invoice_no_id)

        result = await use_case.execute("pay-1")

        mock_repos["invoice_repo"].delete.assert_not_called()
        mock_repos["payment_repo"].delete.assert_called_once_with("pay-1")
        assert result is True
