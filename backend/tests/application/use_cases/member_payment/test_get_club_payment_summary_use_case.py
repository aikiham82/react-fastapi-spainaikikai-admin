"""Tests for GetClubPaymentSummaryUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.license import LicenseStatus
from src.application.use_cases.member_payment.get_club_payment_summary_use_case import (
    GetClubPaymentSummaryUseCase,
)


@pytest.fixture
def mock_repos():
    member_payment_repo = MagicMock()
    club_repo = MagicMock()
    member_repo = MagicMock()
    license_repo = MagicMock()

    club = MagicMock()
    club.name = "Test Club"
    club_repo.find_by_id = AsyncMock(return_value=club)

    member1 = MagicMock()
    member1.id = "m1"
    member1.get_full_name.return_value = "John Doe"

    member2 = MagicMock()
    member2.id = "m2"
    member2.get_full_name.return_value = "Jane Smith"

    member_repo.find_by_club_id = AsyncMock(return_value=[member1, member2])

    member_payment_repo.get_summary_by_member_ids = AsyncMock(return_value={
        "total_amount": 100.0,
        "by_type": {}
    })
    member_payment_repo.find_by_member_ids_year = AsyncMock(return_value=[])

    license_repo.find_by_member_ids = AsyncMock(return_value=[])

    return {
        "member_payment_repo": member_payment_repo,
        "club_repo": club_repo,
        "member_repo": member_repo,
        "license_repo": license_repo,
    }


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetClubPaymentSummaryLicensePaid:

    async def test_license_paid_true_when_license_covers_year(self, mock_repos):
        """license_paid=True when member has license with expiration_date >= Dec 31 of year."""
        license_2026 = MagicMock()
        license_2026.member_id = "m1"
        license_2026.expiration_date = datetime(2026, 12, 31, 23, 59, 59)
        license_2026.status = LicenseStatus.ACTIVE

        mock_repos["license_repo"].find_by_member_ids.return_value = [license_2026]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        m2_summary = next(m for m in result.members if m.member_id == "m2")
        assert m1_summary.license_paid is True
        assert m2_summary.license_paid is False

    async def test_license_paid_false_when_license_expired_before_year(self, mock_repos):
        """license_paid=False when member's license expired before the queried year."""
        old_license = MagicMock()
        old_license.member_id = "m1"
        old_license.expiration_date = datetime(2024, 12, 31, 23, 59, 59)
        old_license.status = LicenseStatus.EXPIRED

        mock_repos["license_repo"].find_by_member_ids.return_value = [old_license]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        assert m1_summary.license_paid is False

    async def test_insurance_paid_still_uses_member_payments(self, mock_repos):
        """insurance_paid should still come from MemberPayment records (unchanged)."""
        insurance_payment = MagicMock()
        insurance_payment.member_id = "m1"
        insurance_payment.is_license_payment = False
        insurance_payment.is_insurance_payment = True
        insurance_payment.amount = 30.0

        mock_repos["member_payment_repo"].find_by_member_ids_year.return_value = [insurance_payment]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        assert m1_summary.insurance_paid is True

    async def test_members_with_license_count_reflects_license_expiration(self, mock_repos):
        """members_with_license count should reflect license-based logic."""
        lic_m1 = MagicMock()
        lic_m1.member_id = "m1"
        lic_m1.expiration_date = datetime(2026, 12, 31, 23, 59, 59)

        lic_m2 = MagicMock()
        lic_m2.member_id = "m2"
        lic_m2.expiration_date = datetime(2026, 12, 31, 23, 59, 59)

        mock_repos["license_repo"].find_by_member_ids.return_value = [lic_m1, lic_m2]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        assert result.members_with_license == 2
