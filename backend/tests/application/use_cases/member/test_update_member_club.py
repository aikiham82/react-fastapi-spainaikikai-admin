"""A member cannot point at a club that does not exist: reading its name broke the members list."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from src.application.use_cases.member.update_member_use_case import UpdateMemberUseCase
from src.domain.entities.member import Member
from src.domain.exceptions.member import InvalidClubForMemberError
from src.infrastructure.adapters.repositories.mongodb_club_repository import MongoDBClubRepository

pytestmark = [pytest.mark.unit]


def member(club_id: str | None = "club-dojo") -> Member:
    return Member(id="member-1", first_name="Ana", last_name="Example", club_id=club_id)


def members_repository(entity: Member) -> AsyncMock:
    return AsyncMock(find_by_id=AsyncMock(return_value=entity), update=AsyncMock(side_effect=lambda saved: saved))


def clubs_repository(exists: bool) -> AsyncMock:
    return AsyncMock(exists=AsyncMock(return_value=exists))


async def test_a_club_that_does_not_exist_is_refused_and_not_saved():
    members = members_repository(member())

    with pytest.raises(InvalidClubForMemberError):
        await UpdateMemberUseCase(members, clubs_repository(False)).execute("member-1", club_id="nope")

    members.update.assert_not_called()


async def test_a_club_that_exists_is_saved():
    members = members_repository(member())

    saved = await UpdateMemberUseCase(members, clubs_repository(True)).execute("member-1", club_id="club-other")

    assert saved.club_id == "club-other"


@pytest.mark.parametrize(
    "changes", [{"city": "Madrid"}, {"club_id": "club-dojo"}], ids=["club-not-sent", "same-club"]
)
async def test_an_edit_that_does_not_change_the_club_does_not_look_it_up(changes):
    clubs = clubs_repository(False)

    await UpdateMemberUseCase(members_repository(member()), clubs).execute("member-1", **changes)

    clubs.exists.assert_not_called()


async def test_a_member_with_a_club_already_gone_can_still_be_edited():
    members = members_repository(member("club-gone"))

    saved = await UpdateMemberUseCase(members, clubs_repository(False)).execute("member-1", city="Madrid")

    assert saved.city == "Madrid"


async def test_reading_clubs_ignores_an_id_that_could_never_exist():
    valid_id = str(ObjectId())
    cursor = MagicMock(to_list=AsyncMock(return_value=[{"_id": ObjectId(valid_id), "name": "Club Ejemplo"}]))
    collection = MagicMock(find=MagicMock(return_value=cursor))
    with patch(
        "src.infrastructure.adapters.repositories.mongodb_club_repository.get_database",
        return_value={"clubs": collection},
    ):
        clubs = await MongoDBClubRepository().find_by_ids(["nope", valid_id, ""])

    assert [club.id for club in clubs] == [valid_id]
    assert collection.find.call_args.args[0] == {"_id": {"$in": [ObjectId(valid_id)]}}
