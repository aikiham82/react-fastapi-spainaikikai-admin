"""Tests for deregistering a club that has left the federation."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.club import Club
from src.domain.entities.member import Member, MemberStatus
from src.domain.entities.user import User
from src.domain.exceptions.club import ClubNotFoundError
from src.application.use_cases.club.deregister_club_use_case import DeregisterClubUseCase


def a_club() -> Club:
    return Club(id="club-1", name="Dojo Ejemplo", email="dojo@example.com")


def a_member(member_id, last_name="Ejemplo") -> Member:
    return Member(id=member_id, first_name="Ana", last_name=last_name, club_id="club-1")


def an_account(member_id) -> User:
    return User(id=f"user-{member_id}", email=f"{member_id}@example.com", username=member_id, hashed_password="h", member_id=member_id)


def use_case(club, members, accounts):
    clubs = MagicMock()
    clubs.find_by_id = AsyncMock(return_value=club)
    clubs.update = AsyncMock(side_effect=lambda c: c)
    member_repo = MagicMock()
    member_repo.find_by_club_id = AsyncMock(return_value=members)
    member_repo.update = AsyncMock(side_effect=lambda m: m)
    user_repo = MagicMock()
    user_repo.find_by_member_id = AsyncMock(side_effect=lambda mid: next((a for a in accounts if a.member_id == mid), None))
    user_repo.update = AsyncMock(side_effect=lambda u: u)
    tokens = MagicMock()
    tokens.invalidate_user_tokens = AsyncMock(return_value=1)
    return DeregisterClubUseCase(clubs, member_repo, user_repo, tokens), clubs, member_repo, user_repo, tokens


@pytest.mark.unit
@pytest.mark.asyncio
class TestDeregisterClub:

    async def test_switches_off_the_club_its_members_and_every_login(self):
        club = a_club()
        placeholder, person = a_member("ph", "(Club Admin)"), a_member("p1")
        club_login, own_login = an_account("ph"), an_account("p1")
        uc, clubs, _, _, tokens = use_case(club, [placeholder, person], [club_login, own_login])

        result = await uc.execute("club-1")

        assert (result.members, result.accounts) == (2, 2)
        assert club.is_active is False
        assert placeholder.status == person.status == MemberStatus.INACTIVE
        assert club_login.is_active is False and own_login.is_active is False
        assert {c.args[0] for c in tokens.invalidate_user_tokens.await_args_list} == {"user-ph", "user-p1"}

    async def test_works_on_members_whose_club_record_is_missing(self):
        person = a_member("p1")
        uc, clubs, _, _, _ = use_case(None, [person], [])

        result = await uc.execute("club-1")

        assert (result.members, result.accounts) == (1, 0)
        assert person.status == MemberStatus.INACTIVE
        clubs.update.assert_not_called()

    async def test_works_on_a_club_with_no_members(self):
        club = a_club()
        uc, *_ = use_case(club, [], [])

        result = await uc.execute("club-1")

        assert (result.members, result.accounts) == (0, 0)
        assert club.is_active is False

    async def test_refuses_an_unknown_club(self):
        uc, *_ = use_case(None, [], [])

        with pytest.raises(ClubNotFoundError):
            await uc.execute("club-1")
