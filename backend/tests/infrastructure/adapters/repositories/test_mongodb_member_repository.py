"""Tests for how the MongoDB Member Repository reads stored documents."""

import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from src.infrastructure.adapters.repositories.mongodb_member_repository import (
    MongoDBMemberRepository,
)


@pytest.mark.unit
@pytest.mark.repository
class TestMongoDBMemberRepositoryToDomain:
    @pytest.fixture
    def repository(self, mock_database):
        with patch(
            "src.infrastructure.adapters.repositories.mongodb_member_repository.get_database",
            return_value=mock_database,
        ):
            return MongoDBMemberRepository()

    def test_a_null_last_name_reads_as_empty(self, repository):
        member = repository._to_domain(
            {"_id": ObjectId(), "first_name": "Ana", "last_name": None, "status": "active"}
        )

        assert member.last_name == ""


@pytest.mark.unit
@pytest.mark.repository
class TestMongoDBMemberRepositorySearchByName:
    @pytest.fixture
    def repository(self, mock_database):
        with patch(
            "src.infrastructure.adapters.repositories.mongodb_member_repository.get_database",
            return_value=mock_database,
        ):
            repository = MongoDBMemberRepository()
        cursor = MagicMock()
        cursor.limit.return_value = cursor
        cursor.to_list = AsyncMock(return_value=[])
        repository.collection = MagicMock()
        repository.collection.find.return_value = cursor
        return repository

    @pytest.mark.asyncio
    async def test_search_by_name_escapes_regex_characters(self, repository):
        await repository.search_by_name("García (Jr")

        query = repository.collection.find.call_args.args[0]
        escaped = {"$regex": re.escape("García (Jr"), "$options": "i"}
        assert query["$or"] == [{"first_name": escaped}, {"last_name": escaped}]
        assert "club_id" not in query

    @pytest.mark.asyncio
    async def test_search_by_name_filters_by_club_id_when_given(self, repository):
        await repository.search_by_name("ana", 20, club_id="club-own")

        query = repository.collection.find.call_args.args[0]
        assert query["club_id"] == "club-own"
        repository.collection.find.return_value.limit.assert_called_once_with(20)
