"""A value the entity refuses is refused on update: stored, it made every list holding it answer 500."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.club.update_club_use_case import UpdateClubUseCase
from src.application.use_cases.member.update_member_use_case import UpdateMemberUseCase
from src.application.use_cases.seminar.update_seminar_use_case import UpdateSeminarUseCase
from src.domain.entities.club import Club
from src.domain.entities.member import Member
from src.domain.entities.seminar import Seminar
from src.domain.exceptions.base import ValidationError

pytestmark = [pytest.mark.unit]

START = datetime(2027, 3, 1, 10)
END = datetime(2027, 3, 2, 18)


def seminar() -> Seminar:
    return Seminar(
        id="seminar-1", title="Seminario de primavera", description="", instructor_name="Ana Example",
        venue="Dojo Ejemplo", address="Calle Falsa 1", city="Madrid", province="Madrid",
        start_date=START, end_date=END, price=50, max_participants=24, club_id="club-dojo",
    )


def repository(entity) -> AsyncMock:
    return AsyncMock(find_by_id=AsyncMock(return_value=entity), update=AsyncMock(side_effect=lambda saved: saved))


class TestSeminar:
    @pytest.mark.parametrize(
        "changes",
        [
            {"title": ""},
            {"title": "   "},
            {"instructor_name": " "},
            {"venue": ""},
            {"price": -1},
            {"max_participants": -1},
            {"start_date": datetime(2027, 3, 3)},
            {"end_date": datetime(2027, 2, 1)},
            {"start_date": END, "end_date": START},
        ],
        ids=["empty-title", "blank-title", "blank-instructor", "empty-venue", "negative-price", "negative-places",
             "start-after-end", "end-before-start", "both-inverted"],
    )
    async def test_a_value_the_entity_refuses_is_not_saved(self, changes):
        seminars = repository(seminar())

        with pytest.raises(ValidationError, match="Hay datos no válidos"):
            await UpdateSeminarUseCase(seminars).execute("seminar-1", **changes)

        seminars.update.assert_not_called()

    @pytest.mark.parametrize(
        "changes",
        [
            {"title": "Seminario de otoño"},
            {"price": 0},
            {"max_participants": 0},
            {"start_date": END},
            {"start_date": datetime(2027, 4, 1), "end_date": datetime(2027, 4, 2)},
        ],
        ids=["title", "free", "no-places", "same-start-and-end", "moved-both-dates"],
    )
    async def test_a_valid_edit_is_saved(self, changes):
        seminars = repository(seminar())

        saved = await UpdateSeminarUseCase(seminars).execute("seminar-1", **changes)

        for field, value in changes.items():
            assert getattr(saved, field) == value

    async def test_none_leaves_the_field_as_it_was(self):
        seminars = repository(seminar())

        saved = await UpdateSeminarUseCase(seminars).execute("seminar-1", title=None, max_participants=None)

        assert (saved.title, saved.max_participants) == ("Seminario de primavera", 24)


def member() -> Member:
    return Member(id="member-1", first_name="Ana", last_name="Example", email="ana@example.com", club_id="club-dojo")


class TestMember:
    @pytest.mark.parametrize(
        "changes", [{"first_name": ""}, {"first_name": "   "}, {"email": "no-at-sign"}], ids=["empty", "blank", "email"]
    )
    async def test_a_value_the_entity_refuses_is_not_saved(self, changes):
        members = repository(member())

        with pytest.raises(ValidationError, match="Hay datos no válidos"):
            await UpdateMemberUseCase(members).execute("member-1", **changes)

        members.update.assert_not_called()

    async def test_a_valid_edit_is_saved(self):
        members = repository(member())

        saved = await UpdateMemberUseCase(members).execute("member-1", first_name="Berta", city="Madrid", email="")

        assert (saved.first_name, saved.city, saved.email) == ("Berta", "Madrid", "")


class TestClub:
    @pytest.mark.parametrize("name", ["", "   "], ids=["empty", "blank"])
    async def test_a_blank_name_is_not_saved(self, name):
        clubs = repository(Club(id="club-1", name="Club Ejemplo"))

        with pytest.raises(ValidationError, match="Hay datos no válidos"):
            await UpdateClubUseCase(clubs).execute("club-1", name=name)

        clubs.update.assert_not_called()

    async def test_a_valid_edit_is_saved(self):
        clubs = repository(Club(id="club-1", name="Club Ejemplo"))

        saved = await UpdateClubUseCase(clubs).execute("club-1", name="Club Nuevo")

        assert saved.name == "Club Nuevo"
