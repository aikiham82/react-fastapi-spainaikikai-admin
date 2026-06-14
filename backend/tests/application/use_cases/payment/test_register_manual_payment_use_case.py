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

    # ------------------------------------------------------------------
    # include_club_fee standalone path (lines 134-146, 182-198)
    # ------------------------------------------------------------------

    async def test_include_club_fee_adds_club_fee_member_payment(self, use_case, mock_repos):
        """include_club_fee=True and club_fee NOT in payment_types adds an extra MemberPayment line."""
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
            include_club_fee=True,
        )
        # create_bulk receives a list with both the kyu line AND the club_fee line
        mps = mock_repos["member_payment_repo"].create_bulk.call_args[0][0]
        mp_types = [mp.payment_type.value for mp in mps]
        assert "cuota_club" in mp_types
        assert "licencia_kyu" in mp_types
        # total should be 2 * 50.0 (kyu price + club_fee price)
        call_arg: Payment = mock_repos["payment_repo"].create.call_args[0][0]
        assert call_arg.amount == 100.0

    async def test_include_club_fee_duplicate_raises_error(self, mock_repos):
        """include_club_fee=True raises DuplicatePaymentForYearError when club_fee already paid."""
        from src.domain.entities.member_payment import MemberPaymentType

        def side_effect(member_id, payment_year, payment_type):
            # Only report club_fee as duplicate
            if payment_type == MemberPaymentType.CUOTA_CLUB:
                return True
            return False

        mock_repos["member_payment_repo"].exists_for_member_year_type = AsyncMock(
            side_effect=side_effect
        )
        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )
        with pytest.raises(DuplicatePaymentForYearError) as exc_info:
            await use_case.execute(
                payer_name="Admin",
                club_id="club1",
                payment_year=2026,
                payment_method="cash",
                member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
                include_club_fee=True,
            )
        assert exc_info.value.member_id == "m1"

    async def test_include_club_fee_skipped_when_already_in_payment_types(self, use_case, mock_repos):
        """include_club_fee=True does NOT add a second club_fee if already listed in payment_types."""
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu", "club_fee"])],
            include_club_fee=True,
        )
        mps = mock_repos["member_payment_repo"].create_bulk.call_args[0][0]
        cuota_club_count = sum(1 for mp in mps if mp.payment_type.value == "cuota_club")
        # Exactly one club_fee line — not doubled
        assert cuota_club_count == 1

    # ------------------------------------------------------------------
    # club_fee deduplication in line-building loop (lines 158-162)
    # ------------------------------------------------------------------

    async def test_club_fee_appears_only_once_across_multiple_assignments(self, use_case, mock_repos):
        """Two assignments both listing club_fee should produce only one club_fee MemberPayment."""
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[
                ManualMemberAssignment("m1", "M One", ["kyu", "club_fee"]),
                ManualMemberAssignment("m2", "M Two", ["dan", "club_fee"]),
            ],
        )
        mps = mock_repos["member_payment_repo"].create_bulk.call_args[0][0]
        cuota_club_count = sum(1 for mp in mps if mp.payment_type.value == "cuota_club")
        assert cuota_club_count == 1

    # ------------------------------------------------------------------
    # Unmapped payment type in duplicate-check loop (line 121)
    # ------------------------------------------------------------------

    async def test_unknown_payment_type_skipped_in_duplicate_check(self, use_case, mock_repos):
        """An item_type with no mapping in ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE is silently skipped."""
        # "unknown_type" is not in ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["unknown_type", "kyu"])],
        )
        # exists_for_member_year_type should be called only for "kyu" (mapped type), not for "unknown_type"
        calls = mock_repos["member_payment_repo"].exists_for_member_year_type.call_args_list
        payment_types_checked = [call.kwargs.get("payment_type") or call.args[2] for call in calls]
        from src.domain.entities.member_payment import MemberPaymentType
        assert MemberPaymentType.LICENCIA_KYU in payment_types_checked
        assert result.payment is not None

    # ------------------------------------------------------------------
    # _fetch_price edge cases (lines 260, 263)
    # ------------------------------------------------------------------

    async def test_fetch_price_returns_zero_for_unmapped_type(self, use_case, mock_repos):
        """_fetch_price returns 0.0 for item types not in PAYMENT_TYPE_TO_PRICE_KEY."""
        # "unknown_type" is not in PAYMENT_TYPE_TO_PRICE_KEY so price_key is None
        price = await use_case._fetch_price("unknown_type")
        assert price == 0.0
        # price_config_repo must NOT be called
        mock_repos["price_config_repo"].find_by_key.assert_not_called()

    async def test_fetch_price_raises_when_config_missing(self, use_case, mock_repos):
        """_fetch_price raises InvalidPaymentDataError when price config record is absent from DB."""
        mock_repos["price_config_repo"].find_by_key = AsyncMock(return_value=None)
        with pytest.raises(InvalidPaymentDataError) as exc_info:
            await use_case._fetch_price("kyu")
        assert "kyu" in str(exc_info.value)

    async def test_execute_raises_invalid_data_when_price_config_missing(self, mock_repos):
        """Full execute() raises InvalidPaymentDataError when price config for a mapped type is missing."""
        mock_repos["price_config_repo"].find_by_key = AsyncMock(return_value=None)
        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )
        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute(
                payer_name="Admin",
                club_id="club1",
                payment_year=2026,
                payment_method="cash",
                member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
            )

    # ------------------------------------------------------------------
    # _create_invoice — line_items_data parsing (lines 298-308)
    # ------------------------------------------------------------------

    async def test_invoice_line_items_built_from_line_items_data(self, mock_repos):
        """Invoice is created with one InvoiceLineItem per entry in payment.line_items_data.

        The payment_repo.create mock must echo back the payment it receives (preserving
        line_items_data) so _create_invoice can parse the JSON and build the right number
        of InvoiceLineItem objects.
        """
        import json as _json

        # Echo back the payment that execute() passes to payment_repo.create, ensuring
        # line_items_data is preserved (the default mock returns a static Payment with
        # line_items_data=None, which would trigger the fallback single-item path).
        async def echo_payment(payment):
            payment.id = "pay-echo"
            return payment

        mock_repos["payment_repo"].create = AsyncMock(side_effect=echo_payment)

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )

        await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[
                ManualMemberAssignment("m1", "M One", ["kyu", "seguro_accidentes"]),
            ],
        )

        assert len(captured_invoices) == 1
        invoice = captured_invoices[0]
        # Two payment types → two line items in the invoice
        assert len(invoice.line_items) == 2

    async def test_invoice_fallback_line_item_when_line_items_data_empty(self, mock_repos):
        """_create_invoice falls back to a single generic line when line_items_data is absent."""
        import json as _json
        from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod

        # Create a payment that has NO line_items_data
        payment_no_items = Payment(
            id="pay-empty",
            club_id="club1",
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_method=PaymentMethod.CASH,
            amount=75.0,
            status=PaymentStatus.COMPLETED,
            payment_year=2026,
            payer_name="Fallback Payer",
            line_items_data=None,  # explicitly absent
        )

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )

        await use_case._create_invoice(payment_no_items)

        assert len(captured_invoices) == 1
        invoice = captured_invoices[0]
        # Single generic fallback line item
        assert len(invoice.line_items) == 1
        assert "Pago manual" in invoice.line_items[0].description
        assert invoice.line_items[0].unit_price == 75.0

    async def test_invoice_fallback_line_item_on_invalid_json(self, mock_repos):
        """_create_invoice falls back to a single generic line when line_items_data is malformed JSON."""
        from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod

        payment_bad_json = Payment(
            id="pay-bad",
            club_id="club1",
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_method=PaymentMethod.CASH,
            amount=30.0,
            status=PaymentStatus.COMPLETED,
            payment_year=2026,
            payer_name="Bad JSON Payer",
            line_items_data="{not valid json",
        )

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )

        await use_case._create_invoice(payment_bad_json)

        assert len(captured_invoices) == 1
        invoice = captured_invoices[0]
        assert len(invoice.line_items) == 1
        assert invoice.line_items[0].unit_price == 30.0

    # ------------------------------------------------------------------
    # _create_invoice — PDF service path (lines 342-353)
    # ------------------------------------------------------------------

    async def test_invoice_pdf_saved_when_pdf_service_provided(self, mock_repos):
        """When pdf_service is provided, save_invoice_pdf is called and pdf_path is set."""
        mock_pdf_service = AsyncMock()
        mock_pdf_service.save_invoice_pdf = AsyncMock(return_value="/invoices/2026-000001.pdf")

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
            pdf_service=mock_pdf_service,
        )

        await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )

        mock_pdf_service.save_invoice_pdf.assert_called_once()
        assert len(captured_invoices) == 1
        assert captured_invoices[0].pdf_path == "/invoices/2026-000001.pdf"

    async def test_invoice_created_even_when_pdf_service_raises(self, mock_repos):
        """When pdf_service.save_invoice_pdf raises, the invoice is still created (warning path)."""
        mock_pdf_service = AsyncMock()
        mock_pdf_service.save_invoice_pdf = AsyncMock(side_effect=Exception("PDF engine failed"))

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
            pdf_service=mock_pdf_service,
        )

        result = await use_case.execute(
            payer_name="Admin",
            club_id="club1",
            payment_year=2026,
            payment_method="cash",
            member_assignments=[ManualMemberAssignment("m1", "M One", ["kyu"])],
        )

        # Invoice still created despite PDF failure
        assert result.invoice is not None
        assert len(captured_invoices) == 1
        # pdf_path is not set since generation failed
        assert captured_invoices[0].pdf_path is None

    # ------------------------------------------------------------------
    # _create_invoice — member email enrichment (lines 287-289)
    # ------------------------------------------------------------------

    async def test_invoice_enriches_customer_email_from_member(self, mock_repos):
        """When payment has a member_id, the member's email is fetched and used on the invoice."""
        from src.domain.entities.payment import Payment, PaymentStatus, PaymentType, PaymentMethod

        mock_member = MagicMock()
        mock_member.email = "member@test.com"
        mock_repos["member_repo"].find_by_id = AsyncMock(return_value=mock_member)

        payment_with_member = Payment(
            id="pay-member",
            club_id="club1",
            member_id="m1",  # has a member_id
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_method=PaymentMethod.CASH,
            amount=50.0,
            status=PaymentStatus.COMPLETED,
            payment_year=2026,
            payer_name="Member Payer",
        )

        captured_invoices = []

        async def capture_create(inv):
            captured_invoices.append(inv)
            return inv

        mock_repos["invoice_repo"].create = AsyncMock(side_effect=capture_create)

        use_case = RegisterManualPaymentUseCase(
            payment_repository=mock_repos["payment_repo"],
            member_payment_repository=mock_repos["member_payment_repo"],
            invoice_repository=mock_repos["invoice_repo"],
            member_repository=mock_repos["member_repo"],
            price_configuration_repository=mock_repos["price_config_repo"],
        )

        await use_case._create_invoice(payment_with_member)

        assert len(captured_invoices) == 1
        assert captured_invoices[0].customer_email == "member@test.com"
