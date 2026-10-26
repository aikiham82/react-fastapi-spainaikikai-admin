"""Tests for UpdateMemberUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member
from src.domain.exceptions.member import InvalidMemberDataError
from src.application.use_cases.member.update_member_use_case import UpdateMemberUseCase


def repository_holding(member: Member) -> MagicMock:
    repo = MagicMock()
    repo.find_by_id = AsyncMock(return_value=member)
    repo.find_by_dni = AsyncMock(return_value=None)
    repo.update = AsyncMock(side_effect=lambda m: m)
    return repo


@pytest.mark.unit
@pytest.mark.asyncio
async def test_refuses_renaming_a_member_to_the_club_account_placeholder():
    repo = repository_holding(Member(id="m1", first_name="Ana", last_name="Ejemplo", club_id="club-1"))

    with pytest.raises(InvalidMemberDataError):
        await UpdateMemberUseCase(repo).execute("m1", last_name="(Club Admin)")
    repo.update.assert_not_called()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_still_edits_the_placeholder_itself():
    repo = repository_holding(Member(id="p1", first_name="Dojo Ejemplo", last_name="(Club Admin)", club_id="club-1"))

    member = await UpdateMemberUseCase(repo).execute("p1", last_name="(Club Admin)", email="dojo@example.com")

    assert member.email == "dojo@example.com"
