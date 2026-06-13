"""Tests for RegisterManualPaymentUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.application.use_cases.payment.register_manual_payment_use_case import (
    RegisterManualPaymentUseCase,
    ManualMemberAssignment,
)
from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod, PaymentType
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.invoice import Invoice, InvoiceStatus
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError


@pytest.fixture
def mock_repos():
    repos = {
        "payment_repo": AsyncMock(),
        "member_payment_repo": AsyncMock(),
        "invoice_repo": AsyncMock(),
        "member_repo": AsyncMock(),
        "price_config_repo": AsyncMock(),
    }
    # Default setup: no duplicates
    repos["member_payment_repo"].exists_for_member_year_type = AsyncMock(return_value=False)
    # create returns the same payment with an id
    created_payment = Payment(
        id="pay123",
        club_id="club1",
        payment_type=PaymentType.ANNUAL_QUOTA,
        payment_method=PaymentMethod.CASH,
        amount=100.0,
        status=PaymentStatus.COMPLETED,
        payment_year=2026,
    )
    repos["payment_repo"].create = AsyncMock(return_value=created_payment)
    repos["member_payment_repo"].create_bulk = AsyncMock(return_value=[])
    repos["invoice_repo"].get_next_invoice_number = AsyncMock(return_value="2026-000001")
    repos["invoice_repo"].create = AsyncMock(
        return_value=Invoice(
            invoice_number="2026-000001",
            payment_id="pay123",
            member_id="club1",  # club_id used as fallback when payment has no member_id
            status=InvoiceStatus.ISSUED,
        )
    )
    # price config returns a price config with price=50.0
    mock_price = MagicMock()
    mock_price.price = 50.0
    repos["price_config_repo"].find_by_key = AsyncMock(return_value=mock_price)
    return repos


@pytest.fixture
def use_case(mock_repos):
    return RegisterManualPaymentUseCase(
        payment_repository=mock_repos["payment_repo"],
        member_payment_repository=mock_repos["member_payment_repo"],
        invoice_repository=mock_repos["invoice_repo"],
        member_repository=mock_repos["member_repo"],
        price_configuration_repository=mock_repos["price_config_repo"],
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestRegisterManualPaymentUseCase:

    async def test_creates_parent_payment_with_completed_status(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Test Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["payment_repo"].create.assert_called_once()
        call_arg: Payment = mock_repos["payment_repo"].create.call_args[0][0]
        assert call_arg.status == PaymentStatus.COMPLETED
        assert call_arg.payment_method == PaymentMethod.CASH

    async def test_creates_member_payments_with_correct_payment_id(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["member_payment_repo"].create_bulk.assert_called_once()
        mps = mock_repos["member_payment_repo"].create_bulk.call_args[0][0]
        assert all(mp.payment_id == "pay123" for mp in mps)

    async def test_raises_duplicate_if_member_type_year_already_paid(self, use_case, mock_repos):
        mock_repos["member_payment_repo"].exists_for_member_year_type = AsyncMock(return_value=True)
        with pytest.raises(DuplicatePaymentForYearError):
            await use_case.execute(
                payer_name="Admin",
                club_id="club1",
                payment_year=2026,
                payment_method="cash",
                member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
            )
        mock_repos["payment_repo"].create.assert_not_called()

    async def test_raises_on_empty_member_assignments(self, use_case, mock_repos):
        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute(
                payer_name="Admin",
                club_id="club1",
                payment_year=2026,
                payment_method="cash",
                member_assignments=[],
            )

    async def test_total_amount_equals_sum_of_line_prices(self, use_case, mock_repos):
        await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[
                ManualMemberAssignment("m1", "M One", ["kyu", "seguro_accidentes"]),
            ],
        )
        call_arg: Payment = mock_repos["payment_repo"].create.call_args[0][0]
        assert call_arg.amount == 100.0  # 2 x 50.0

    async def test_creates_invoice_after_payment(self, use_case, mock_repos):
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        mock_repos["invoice_repo"].create.assert_called_once()
        assert result.invoice is not None
        assert result.invoice.invoice_number == "2026-000001"

    async def test_invoice_failure_does_not_abort_payment(self, use_case, mock_repos):
        mock_repos["invoice_repo"].create.side_effect = Exception("DB error")
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )
        assert result.payment is not None
        assert result.invoice is None
