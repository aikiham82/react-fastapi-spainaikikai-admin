"""Tests for CreateMemberUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member
from src.domain.exceptions.member import MemberAlreadyExistsError
from src.application.use_cases.member.create_member_use_case import CreateMemberUseCase


@pytest.fixture
def member_without_dni():
    return Member(id="member123", first_name="Ana", last_name="Example", dni="")


@pytest.fixture
def mock_member_repository():
    mock_repo = MagicMock()
    mock_repo.find_by_dni = AsyncMock(return_value=None)
    mock_repo.find_by_email = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock(side_effect=lambda member: member)
    return mock_repo


@pytest.fixture
def mock_club_repository():
    mock_repo = MagicMock()
    mock_repo.exists = AsyncMock(return_value=True)
    return mock_repo


@pytest.fixture
def use_case(mock_member_repository, mock_club_repository):
    return CreateMemberUseCase(mock_member_repository, mock_club_repository)


async def create_with_dni(use_case, dni):
    return await use_case.execute(
        first_name="Luis",
        last_name="Example",
        dni=dni,
        email="",
        phone="",
        address="",
        city="",
        province="",
        postal_code="",
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_creates_member_with_empty_dni_when_another_has_empty_dni(
    use_case, mock_member_repository, member_without_dni
):
    mock_member_repository.find_by_dni.return_value = member_without_dni

    member = await create_with_dni(use_case, "")

    assert member.dni == ""
    mock_member_repository.create.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_stores_whitespace_only_dni_as_empty_without_lookup(use_case, mock_member_repository):
    member = await create_with_dni(use_case, "   ")

    assert member.dni == ""
    mock_member_repository.find_by_dni.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_strips_dni_before_checking_and_storing(use_case, mock_member_repository):
    member = await create_with_dni(use_case, "  12345678Z ")

    mock_member_repository.find_by_dni.assert_awaited_once_with("12345678Z")
    assert member.dni == "12345678Z"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_raises_for_duplicate_non_empty_dni(use_case, mock_member_repository, member_without_dni):
    mock_member_repository.find_by_dni.return_value = member_without_dni

    with pytest.raises(MemberAlreadyExistsError, match="Ya existe un miembro con ese DNI"):
        await create_with_dni(use_case, "12345678Z")

    mock_member_repository.create.assert_not_awaited()
