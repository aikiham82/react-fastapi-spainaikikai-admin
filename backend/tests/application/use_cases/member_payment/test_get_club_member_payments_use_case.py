"""Tests for GetClubMemberPaymentsUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.application.use_cases.member_payment.get_club_member_payments_use_case import (
    GetClubMemberPaymentsUseCase,
)
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus


def _make_member(member_id):
    m = MagicMock()
    m.id = member_id
    m.get_full_name.return_value = f"Name {member_id}"
    return m


def _make_member_payment(mp_id: str, member_id: str) -> MemberPayment:
    return MemberPayment(
        id=mp_id,
        payment_id="pay1",
        member_id=member_id,
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="licencia_kyu - 2026",
        amount=50.0,
        status=MemberPaymentStatus.COMPLETED,
    )


@pytest.fixture
def mock_member_payment_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_member_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def use_case(mock_member_payment_repo, mock_member_repo):
    return GetClubMemberPaymentsUseCase(
        member_payment_repository=mock_member_payment_repo,
        member_repository=mock_member_repo,
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetClubMemberPaymentsUseCase:

    async def test_no_members_returns_empty_list(self, use_case, mock_member_repo, mock_member_payment_repo):
        """When club has no members, return [] and never call find_by_member_ids_year."""
        mock_member_repo.find_by_club_id = AsyncMock(return_value=[])

        result = await use_case.execute(club_id="club1", payment_year=2026)

        assert result == []
        mock_member_payment_repo.find_by_member_ids_year.assert_not_called()

    async def test_members_present_calls_find_by_member_ids_year_and_returns_result(
        self, use_case, mock_member_repo, mock_member_payment_repo
    ):
        """When members exist, calls find_by_member_ids_year with their ids and the year."""
        members = [_make_member("m1"), _make_member("m2")]
        mock_member_repo.find_by_club_id = AsyncMock(return_value=members)

        expected_payments = [
            _make_member_payment("mp1", "m1"),
            _make_member_payment("mp2", "m2"),
        ]
        mock_member_payment_repo.find_by_member_ids_year = AsyncMock(return_value=expected_payments)

        result = await use_case.execute(club_id="club1", payment_year=2026)

        mock_member_payment_repo.find_by_member_ids_year.assert_called_once_with(
            member_ids=["m1", "m2"],
            payment_year=2026,
        )
        assert [item.payment for item in result] == expected_payments
        # Each payment is enriched with the resolved member name
        assert [item.member_name for item in result] == ["Name m1", "Name m2"]

    async def test_members_with_none_ids_are_filtered_out(
        self, use_case, mock_member_repo, mock_member_payment_repo
    ):
        """Members with None id are excluded from the member_ids list passed downstream."""
        m_valid = _make_member("m1")
        m_none = _make_member(None)

        mock_member_repo.find_by_club_id = AsyncMock(return_value=[m_valid, m_none])

        expected_payments = [_make_member_payment("mp1", "m1")]
        mock_member_payment_repo.find_by_member_ids_year = AsyncMock(return_value=expected_payments)

        result = await use_case.execute(club_id="club1", payment_year=2026)

        mock_member_payment_repo.find_by_member_ids_year.assert_called_once_with(
            member_ids=["m1"],
            payment_year=2026,
        )
        assert [item.payment for item in result] == expected_payments
        assert [item.member_name for item in result] == ["Name m1"]

    async def test_all_members_have_none_ids_returns_empty_list(
        self, use_case, mock_member_repo, mock_member_payment_repo
    ):
        """When all members have None ids, return [] and never call find_by_member_ids_year."""
        members = [_make_member(None), _make_member(None)]
        mock_member_repo.find_by_club_id = AsyncMock(return_value=members)

        result = await use_case.execute(club_id="club1", payment_year=2026)

        assert result == []
        mock_member_payment_repo.find_by_member_ids_year.assert_not_called()
