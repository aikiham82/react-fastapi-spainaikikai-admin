"""Tests for how the MongoDB Member Repository reads stored documents."""

from unittest.mock import patch

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
