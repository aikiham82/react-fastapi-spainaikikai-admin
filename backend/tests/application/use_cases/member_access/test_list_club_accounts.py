"""Tests for the list of clubs still signing in with a shared club account."""

from datetime import datetime

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.club import Club
from src.domain.entities.license import InstructorCategory, License, LicenseStatus
from src.domain.entities.member import ClubRole, Member, MemberStatus
from src.domain.entities.user import User
from src.application.use_cases.member_access import ListClubAccountsUseCase


def a_placeholder(club_id="club-1") -> Member:
    return Member(id=f"placeholder-{club_id}", first_name="Dojo Ejemplo", last_name="(Club Admin)", club_id=club_id, club_role=ClubRole.ADMIN)


def a_person(member_id, first_name="Ana", club_id="club-1", status=MemberStatus.ACTIVE) -> Member:
    return Member(id=member_id, first_name=first_name, last_name="Ejemplo", club_id=club_id, status=status)


def a_licence(member_id, category, status=LicenseStatus.ACTIVE, expires=datetime(2025, 12, 31)) -> License:
    return License(id=f"lic-{member_id}", license_number=f"N-{member_id}", member_id=member_id,
                   instructor_category=category, status=status, expiration_date=expires, grade="3 Dan")


def the_club_account(member_id="placeholder-club-1", **overrides) -> User:
    fields = dict(id=f"user-{member_id}", email="dojo@example.com", username="DOJO EJEMPLO", hashed_password="h", member_id=member_id)
    return User(**{**fields, **overrides})


def use_case(members, users, licences, clubs=(Club(id="club-1", name="Dojo Ejemplo", email="dojo@example.com"),)) -> ListClubAccountsUseCase:
    member_repo = MagicMock()
    member_repo.find_all = AsyncMock(return_value=list(members))
    member_repo.find_by_club_id = AsyncMock(side_effect=lambda club_id, limit=0: [m for m in members if m.club_id == club_id])
    user_repo = MagicMock()
    user_repo.find_by_member_id = AsyncMock(side_effect=lambda member_id: next((u for u in users if u.member_id == member_id), None))
    licence_repo = MagicMock()
    licence_repo.find_by_member_ids = AsyncMock(side_effect=lambda ids, limit=0: [l for l in licences if l.member_id in ids])
    club_repo = MagicMock()
    club_repo.find_by_id = AsyncMock(side_effect=lambda club_id: next((c for c in clubs if c.id == club_id), None))
    return ListClubAccountsUseCase(member_repo, user_repo, club_repo, licence_repo)


def names(summary) -> list:
    return [c.name for c in summary.candidates]


@pytest.mark.unit
@pytest.mark.asyncio
class TestListClubAccounts:

    async def test_lists_the_club_account_with_its_shidoin(self):
        members = [a_placeholder(), a_person("p1")]

        [summary] = await use_case(members, [the_club_account()], [a_licence("p1", InstructorCategory.SHIDOIN)]).execute()

        assert (summary.club_id, summary.club_name, summary.username, summary.email) == ("club-1", "Dojo Ejemplo", "DOJO EJEMPLO", "dojo@example.com")
        assert [(c.member_id, c.name, c.instructor_category) for c in summary.candidates] == [("p1", "Ana Ejemplo", "shidoin")]

    async def test_prefers_the_shidoin_over_the_fukushidoin(self):
        members = [a_placeholder(), a_person("p1", "Ana"), a_person("p2", "Luis")]
        licences = [a_licence("p1", InstructorCategory.FUKUSHIDOIN), a_licence("p2", InstructorCategory.SHIDOIN)]

        [summary] = await use_case(members, [the_club_account()], licences).execute()

        assert names(summary) == ["Luis Ejemplo"]

    async def test_falls_back_to_the_fukushidoin(self):
        members = [a_placeholder(), a_person("p1"), a_person("p2", "Luis")]
        licences = [a_licence("p1", InstructorCategory.FUKUSHIDOIN), a_licence("p2", InstructorCategory.NONE)]

        [summary] = await use_case(members, [the_club_account()], licences).execute()

        assert names(summary) == ["Ana Ejemplo"]

    async def test_offers_every_shidoin_when_there_are_several(self):
        members = [a_placeholder(), a_person("p1", "Ana"), a_person("p2", "Luis")]
        licences = [a_licence("p1", InstructorCategory.SHIDOIN), a_licence("p2", InstructorCategory.SHIDOIN)]

        [summary] = await use_case(members, [the_club_account()], licences).execute()

        assert names(summary) == ["Ana Ejemplo", "Luis Ejemplo"]

    async def test_offers_nobody_when_the_club_has_no_instructor(self):
        members = [a_placeholder(), a_person("p1")]

        [summary] = await use_case(members, [the_club_account()], [a_licence("p1", InstructorCategory.NONE)]).execute()

        assert summary.candidates == []

    async def test_a_past_licence_still_names_the_shidoin(self):
        members = [a_placeholder(), a_person("p1")]

        [summary] = await use_case(members, [the_club_account()], [a_licence("p1", InstructorCategory.SHIDOIN, expires=datetime(2024, 12, 31))]).execute()

        assert names(summary) == ["Ana Ejemplo"]

    async def test_an_annulled_licence_does_not_name_the_shidoin(self):
        members = [a_placeholder(), a_person("p1")]

        [summary] = await use_case(members, [the_club_account()], [a_licence("p1", InstructorCategory.SHIDOIN, status=LicenseStatus.REVOKED)]).execute()

        assert summary.candidates == []

    async def test_skips_inactive_members_and_members_with_their_own_account(self):
        members = [a_placeholder(), a_person("p1"), a_person("p2", "Luis", status=MemberStatus.INACTIVE)]
        users = [the_club_account(), the_club_account(member_id="p1", id="own", email="ana@example.com")]
        licences = [a_licence("p1", InstructorCategory.SHIDOIN), a_licence("p2", InstructorCategory.SHIDOIN)]

        [summary] = await use_case(members, users, licences).execute()

        assert summary.candidates == []

    async def test_offers_the_fukushidoin_when_every_shidoin_has_an_account(self):
        members = [a_placeholder(), a_person("p1"), a_person("p2", "Luis")]
        users = [the_club_account(), the_club_account(member_id="p1", id="own", email="ana@example.com")]
        licences = [a_licence("p1", InstructorCategory.SHIDOIN), a_licence("p2", InstructorCategory.FUKUSHIDOIN)]

        [summary] = await use_case(members, users, licences).execute()

        assert names(summary) == ["Luis Ejemplo"]

    async def test_names_the_club_from_its_placeholder_when_the_club_record_is_missing(self):
        members = [a_placeholder("club-gone"), a_person("p1", club_id="club-gone")]

        [summary] = await use_case(members, [the_club_account(member_id="placeholder-club-gone")], []).execute()

        assert summary.club_name == "Dojo Ejemplo"

    async def test_leaves_out_a_placeholder_with_no_active_account(self):
        members = [a_placeholder(), a_placeholder("club-2"), a_person("p1")]

        result = await use_case(members, [the_club_account(is_active=False)], []).execute()

        assert result == []
