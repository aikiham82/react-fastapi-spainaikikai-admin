"""Tests for GetAllClubsPaymentSummaryUseCase."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.domain.entities.member import Member
from src.application.use_cases.member_payment.get_all_clubs_payment_summary_use_case import (
    GetAllClubsPaymentSummaryUseCase,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_counts_only_members_who_had_joined_by_the_year():
    club = MagicMock(id="club1", is_active=True)
    club.name = "Example Club"
    club_repo = MagicMock(find_all=AsyncMock(return_value=[club]))
    member_repo = MagicMock(find_by_club_id=AsyncMock(return_value=[
        Member(id="m1", first_name="Ana", registration_date=datetime(2024, 1, 1)),
        Member(id="m2", first_name="Ben", registration_date=datetime(2026, 3, 1)),
    ]))
    member_payment_repo = MagicMock(
        get_summary_by_member_ids=AsyncMock(return_value={"total_amount": 0.0}),
        find_by_member_ids_year=AsyncMock(return_value=[]),
    )

    result = await GetAllClubsPaymentSummaryUseCase(
        member_payment_repository=member_payment_repo,
        club_repository=club_repo,
        member_repository=member_repo,
    ).execute(payment_year=2025)

    assert result.clubs[0].total_members == 1
    assert result.grand_total_members == 1
