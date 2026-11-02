"""MongoDB's case-insensitive regex folds ſ into s; a member's email must really be the one asked for."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.infrastructure.adapters.repositories.mongodb_member_repository import MongoDBMemberRepository

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


def a_member_doc(email):
    return {"_id": "507f1f77bcf86cd799439011", "first_name": "Sara", "last_name": "Ejemplo", "email": email, "club_id": "club-1"}


def repository_returning(*emails):
    collection = MagicMock()
    collection.find.return_value.to_list = AsyncMock(return_value=[a_member_doc(email) for email in emails])
    with patch(
        "src.infrastructure.adapters.repositories.mongodb_member_repository.get_database",
        return_value={"members": collection},
    ):
        return MongoDBMemberRepository()


async def test_a_look_alike_of_an_email_finds_nobody():
    repository = repository_returning("sara@example.com")

    assert await repository.find_all_by_email("ſara@example.com") == []


async def test_the_same_email_in_other_case_and_spacing_is_found():
    repository = repository_returning(" Sara@Example.com ")

    assert len(await repository.find_all_by_email("sara@example.com")) == 1


async def test_an_email_with_accents_is_found():
    repository = repository_returning("maría@example.com")

    assert len(await repository.find_all_by_email("maría@example.com")) == 1
