"""Tests for the date windows queried by the MongoDB Insurance Repository."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

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

    @pytest.mark.asyncio
    async def test_find_expiring_soon_leaves_out_already_expired_insurances(self, repository):
        cursor = MagicMock()
        cursor.limit.return_value = cursor
        cursor.to_list = AsyncMock(return_value=[])
        repository.collection.find = MagicMock(return_value=cursor)
        before = datetime.utcnow()

        await repository.find_expiring_soon(days_threshold=30)

        end_date = repository.collection.find.call_args[0][0]["end_date"]
        assert before <= end_date["$gte"] <= datetime.utcnow()
        assert end_date["$lte"] > end_date["$gte"]

    def test_to_domain_reads_dates_stored_as_text(self, repository):
        insurance = repository._to_domain({
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "member_id": "member-1",
            "insurance_type": "accident",
            "policy_number": "PENDIENTE",
            "insurance_company": "Spain Aikikai",
            "status": "active",
            "start_date": "2025-10-01T02:00:00+02:00",
            "end_date": "2026-09-30T23:59:59Z",
        })

        assert insurance.start_date == datetime(2025, 10, 1)
        assert insurance.end_date == datetime(2026, 9, 30, 23, 59, 59)
