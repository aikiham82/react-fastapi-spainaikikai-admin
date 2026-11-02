"""A value the entity refuses is refused on update: stored, it made every list holding it answer 500."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.seminar.update_seminar_use_case import UpdateSeminarUseCase
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
