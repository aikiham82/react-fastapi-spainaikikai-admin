"""Tests for passing a club's shared account onto a real person."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import ClubRole, Member, MemberStatus
from src.domain.entities.user import User
from src.domain.exceptions.member import InactiveMemberError, InvalidClubForMemberError, MemberNotFoundError
from src.domain.exceptions.user import ClubAccountNotFoundError, UserAlreadyExistsError
from src.application.use_cases.member_access import TransferClubAccountUseCase


def a_placeholder(club_id="club-1") -> Member:
    return Member(id="placeholder-1", first_name="Dojo Ejemplo", last_name="(Club Admin)", club_id=club_id, club_role=ClubRole.ADMIN)


def a_person(member_id="person-1", club_id="club-1") -> Member:
    return Member(id=member_id, first_name="Ana", last_name="Ejemplo", club_id=club_id)


def the_club_account(**overrides) -> User:
    fields = dict(id="club-user", email="dojo@example.com", username="DOJO EJEMPLO", hashed_password="h", member_id="placeholder-1")
    return User(**{**fields, **overrides})


def repositories(members: list, users: list):
    by_id = {m.id: m for m in members}
    member_repo = MagicMock()
    member_repo.find_by_id = AsyncMock(side_effect=lambda member_id: by_id.get(member_id))
    member_repo.find_by_club_id = AsyncMock(side_effect=lambda club_id, limit=0: [m for m in members if m.club_id == club_id])
    member_repo.update = AsyncMock(side_effect=lambda m: m)
    user_repo = MagicMock()
    user_repo.find_by_member_id = AsyncMock(side_effect=lambda member_id: next((u for u in users if u.member_id == member_id), None))
    user_repo.find_by_id = AsyncMock(side_effect=lambda user_id: next((u for u in users if u.id == user_id), None))
    user_repo.update = AsyncMock(side_effect=lambda u: u)
    return member_repo, user_repo


def tokens() -> MagicMock:
    repo = MagicMock()
    repo.invalidate_user_tokens = AsyncMock(return_value=1)
    return repo


def transfer(members, users, token_repo=None, account_id="club-user"):
    return TransferClubAccountUseCase(members, users, token_repo or tokens()).execute("club-1", account_id, "person-1")


@pytest.mark.unit
@pytest.mark.asyncio
class TestTransferClubAccount:

    async def test_the_club_account_becomes_the_persons_keeping_its_credentials(self):
        placeholder, person, account = a_placeholder(), a_person(), the_club_account()
        members, users = repositories([placeholder, person], [account])

        user = await transfer(members, users)

        assert (user.id, user.email, user.username, user.hashed_password) == ("club-user", "dojo@example.com", "DOJO EJEMPLO", "h")
        assert user.member_id == "person-1"
        assert person.club_role == ClubRole.ADMIN
        assert placeholder.status == MemberStatus.INACTIVE

    async def test_old_reset_links_of_the_club_account_stop_working(self):
        members, users = repositories([a_placeholder(), a_person()], [the_club_account()])
        token_repo = tokens()

        await transfer(members, users, token_repo)

        token_repo.invalidate_user_tokens.assert_awaited_once_with("club-user")

    async def test_refuses_an_account_that_is_not_a_club_placeholder(self):
        renamed = Member(id="renamed-1", first_name="Otro", last_name="Ejemplo", club_id="club-1")
        own = the_club_account(id="own-user", email="otro@example.com", username="otro@example.com", member_id="renamed-1")
        members, users = repositories([a_placeholder(), renamed, a_person()], [the_club_account(), own])

        with pytest.raises(ClubAccountNotFoundError):
            await transfer(members, users, account_id="own-user")
        users.update.assert_not_called()

    async def test_refuses_the_club_account_of_another_club(self):
        members, users = repositories([a_placeholder(club_id="club-2"), a_person()], [the_club_account()])

        with pytest.raises(ClubAccountNotFoundError):
            await transfer(members, users)

    async def test_refuses_a_member_of_another_club(self):
        members, users = repositories([a_placeholder(), a_person(club_id="club-2")], [the_club_account()])

        with pytest.raises(InvalidClubForMemberError):
            await transfer(members, users)
        users.update.assert_not_called()

    async def test_refuses_an_inactive_member(self):
        person = a_person()
        person.deactivate()
        members, users = repositories([a_placeholder(), person], [the_club_account()])

        with pytest.raises(InactiveMemberError):
            await transfer(members, users)
        users.update.assert_not_called()

    async def test_refuses_a_member_who_already_has_an_account(self):
        own = the_club_account(id="own-user", email="ana@example.com", username="ana@example.com", member_id="person-1")
        members, users = repositories([a_placeholder(), a_person()], [the_club_account(), own])

        with pytest.raises(UserAlreadyExistsError):
            await transfer(members, users)
        users.update.assert_not_called()

    async def test_refuses_a_club_without_a_club_account(self):
        members, users = repositories([a_placeholder(), a_person()], [])

        with pytest.raises(ClubAccountNotFoundError):
            await transfer(members, users)

    async def test_ignores_a_deactivated_club_account(self):
        members, users = repositories([a_placeholder(), a_person()], [the_club_account(is_active=False)])

        with pytest.raises(ClubAccountNotFoundError):
            await transfer(members, users)

    async def test_refuses_an_unknown_member(self):
        members, users = repositories([a_placeholder()], [the_club_account()])

        with pytest.raises(MemberNotFoundError):
            await transfer(members, users)
