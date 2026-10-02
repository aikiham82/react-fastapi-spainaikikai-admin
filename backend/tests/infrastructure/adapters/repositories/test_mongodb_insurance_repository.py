"""Tests for the date windows queried by the MongoDB Insurance Repository."""

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from src.domain.entities.insurance import InsuranceType
from src.infrastructure.adapters.repositories.mongodb_insurance_repository import (
    MongoDBInsuranceRepository,
)


@pytest.mark.unit
@pytest.mark.repository
class TestMongoDBInsuranceRepositorySeasonWindow:
    @pytest.fixture
    def repository(self, mock_mongo_collection, mock_database):
        with patch(
            "src.infrastructure.adapters.repositories.mongodb_insurance_repository.get_database",
            return_value=mock_database,
        ):
            return MongoDBInsuranceRepository()

    @pytest.mark.asyncio
    async def test_find_active_by_member_year_type_matches_the_season_window(self, repository):
        repository.collection.find_one = AsyncMock(return_value=None)

        await repository.find_active_by_member_year_type(
            member_id="member-1",
            payment_year=2026,
            insurance_type=InsuranceType.ACCIDENT,
        )

        query = repository.collection.find_one.call_args[0][0]
        assert query["start_date"] == {"$gte": datetime(2025, 10, 1)}
        assert query["end_date"] == {"$lte": datetime(2026, 9, 30, 23, 59, 59)}

    @pytest.mark.asyncio
    async def test_find_active_by_member_year_type_excludes_the_previous_season(self, repository):
        repository.collection.find_one = AsyncMock(return_value=None)

        await repository.find_active_by_member_year_type(
            member_id="member-1",
            payment_year=2027,
            insurance_type=InsuranceType.ACCIDENT,
        )

        query = repository.collection.find_one.call_args[0][0]
        assert query["start_date"]["$gte"] > datetime(2026, 9, 30, 23, 59, 59)
