"""A payment below its refund is refused when read, so every list holding it answered 500."""

from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.payment.delete_member_payment_use_case import DeleteMemberPaymentUseCase
from src.application.use_cases.payment.update_member_payment_use_case import UpdateMemberPaymentUseCase
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import InvalidPaymentDataError

pytestmark = [pytest.mark.unit]


def refunded_payment() -> Payment:
    return Payment(
        id="payment-1", club_id="club-dojo", amount=30.0, payment_year=2026, refund_amount=20.0,
        payment_method=PaymentMethod.CASH, status=PaymentStatus.REFUNDED,
    )


def line(line_id: str, amount: float) -> MemberPayment:
    return MemberPayment(
        id=line_id, payment_id="payment-1", member_id=f"member-{line_id}", payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU, amount=amount, status=MemberPaymentStatus.COMPLETED,
    )


def payment_repository(payment: Payment) -> AsyncMock:
    return AsyncMock(find_by_id=AsyncMock(return_value=payment), update=AsyncMock(side_effect=lambda saved: saved))


def lines_repository(lines: list[MemberPayment]) -> AsyncMock:
    return AsyncMock(
        find_by_id=AsyncMock(side_effect=lambda line_id: next(item for item in lines if item.id == line_id)),
        find_by_payment_id=AsyncMock(return_value=lines),
        update=AsyncMock(side_effect=lambda saved: saved),
        delete=AsyncMock(return_value=True),
    )


def edit_line_use_case(lines: AsyncMock, payments: AsyncMock) -> UpdateMemberPaymentUseCase:
    return UpdateMemberPaymentUseCase(
        member_payment_repository=lines,
        payment_repository=payments,
        license_repository=AsyncMock(),
        insurance_repository=AsyncMock(),
    )


class TestEditingALine:
    async def test_a_lower_line_that_breaks_the_refund_is_refused_and_not_saved(self):
        lines = lines_repository([line("a", 15.0), line("b", 15.0)])
        payments = payment_repository(refunded_payment())

        with pytest.raises(InvalidPaymentDataError, match="menor que lo ya reembolsado"):
            await edit_line_use_case(lines, payments).execute("a", amount=1.0)

        lines.update.assert_not_called()
        payments.update.assert_not_called()

    async def test_cancelling_a_line_that_breaks_the_refund_is_refused(self):
        lines = lines_repository([line("a", 15.0), line("b", 15.0)])
        payments = payment_repository(refunded_payment())

        with pytest.raises(InvalidPaymentDataError):
            await edit_line_use_case(lines, payments).execute("a", status="refunded")

        lines.update.assert_not_called()

    async def test_a_lower_line_that_still_covers_the_refund_is_saved(self):
        lines = lines_repository([line("a", 15.0), line("b", 15.0)])
        payments = payment_repository(refunded_payment())

        saved = await edit_line_use_case(lines, payments).execute("a", amount=5.0)

        assert saved.amount == 5.0
        lines.update.assert_called_once()

    async def test_a_line_of_a_payment_that_no_longer_exists_can_still_be_edited(self):
        lines = lines_repository([line("a", 15.0)])
        payments = AsyncMock(find_by_id=AsyncMock(return_value=None))

        saved = await edit_line_use_case(lines, payments).execute("a", amount=5.0)

        assert saved.amount == 5.0


class TestDeletingALine:
    async def test_deleting_a_line_that_breaks_the_refund_is_refused_and_not_deleted(self):
        lines = lines_repository([line("a", 15.0), line("b", 15.0)])
        payments = payment_repository(refunded_payment())
        use_case = DeleteMemberPaymentUseCase(member_payment_repository=lines, payment_repository=payments)

        with pytest.raises(InvalidPaymentDataError, match="menor que lo ya reembolsado"):
            await use_case.execute("a")

        lines.delete.assert_not_called()

    async def test_deleting_a_line_that_still_covers_the_refund_is_done(self):
        lines = lines_repository([line("a", 5.0), line("b", 25.0)])
        payments = payment_repository(refunded_payment())
        use_case = DeleteMemberPaymentUseCase(member_payment_repository=lines, payment_repository=payments)

        assert await use_case.execute("a") is True
        lines.delete.assert_called_once_with("a")


class TestAPaymentAlreadyBelowItsRefund:
    """Two simultaneous edits can still store one; it has to stay correctable."""

    def stored(self) -> Payment:
        return Payment(
            id="payment-1", club_id="club-dojo", amount=80.0, payment_year=2026, refund_amount=100.0,
            payment_method=PaymentMethod.CASH, status=PaymentStatus.REFUNDED,
        )

    async def test_an_edit_that_leaves_the_total_as_it_is_works(self):
        lines = lines_repository([line("a", 50.0), line("b", 30.0)])

        saved = await edit_line_use_case(lines, payment_repository(self.stored())).execute("a", concept="Licencia")

        assert saved.concept == "Licencia"

    async def test_raising_a_line_works_even_if_it_is_not_enough_yet(self):
        lines = lines_repository([line("a", 50.0), line("b", 30.0)])

        saved = await edit_line_use_case(lines, payment_repository(self.stored())).execute("a", amount=60.0)

        assert saved.amount == 60.0

    async def test_lowering_a_line_is_still_refused(self):
        lines = lines_repository([line("a", 50.0), line("b", 30.0)])

        with pytest.raises(InvalidPaymentDataError):
            await edit_line_use_case(lines, payment_repository(self.stored())).execute("a", amount=40.0)

    async def test_deleting_a_line_is_still_refused(self):
        lines = lines_repository([line("a", 50.0), line("b", 30.0)])
        use_case = DeleteMemberPaymentUseCase(
            member_payment_repository=lines, payment_repository=payment_repository(self.stored())
        )

        with pytest.raises(InvalidPaymentDataError):
            await use_case.execute("a")
