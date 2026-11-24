"""Tests for CreateInsuranceUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.application.use_cases.insurance.create_insurance_use_case import CreateInsuranceUseCase


@pytest.mark.unit
@pytest.mark.asyncio
async def test_two_members_can_hold_the_same_policy_number():
    repository = MagicMock()
    repository.create = AsyncMock(side_effect=lambda insurance: insurance)

    created = await CreateInsuranceUseCase(repository).execute(
        member_id="member2",
        policy_number="PENDIENTE",
        insurance_company="Mapfre",
        start_date=datetime(2026, 11, 24),
        end_date=datetime(2027, 9, 30),
    )

    assert created.member_id == "member2"
    assert created.policy_number == "PENDIENTE"
