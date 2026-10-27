"""The dashboard licence widgets count a club's licences through its members, and expiry by date."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app import create_app
from src.infrastructure.web.dependencies import get_auth_context
from tests.api.callers import OWN_CLUB, club_admin, super_admin

pytestmark = [pytest.mark.api]

CLUB_MEMBER_IDS = ["665f00000000000000000001", "665f00000000000000000002"]


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    async def to_list(self, length=None):
        return self.rows

    def __aiter__(self):
        self._iter = iter(self.rows)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


def fake_collection(rows=()):
    collection = MagicMock()
    collection.count_documents = AsyncMock(return_value=0)
    collection.find = MagicMock(return_value=FakeCursor(list(rows)))
    collection.find_one = AsyncMock(return_value=None)
    collection.aggregate = MagicMock(return_value=FakeCursor([]))
    collection.distinct = AsyncMock(return_value=[])
    return collection


@pytest.fixture
def db():
    collections = {"members": fake_collection([{"_id": member_id} for member_id in CLUB_MEMBER_IDS])}
    database = MagicMock()
    database.__getitem__.side_effect = lambda name: collections.setdefault(name, fake_collection())
    return database, collections


def stats_as(ctx, database):
    app = create_app()
    app.dependency_overrides = {get_auth_context: lambda: ctx}
    with patch("src.infrastructure.web.routers.dashboard.get_database", return_value=database):
        return TestClient(app).get("/api/dashboard/stats")


def licence_filters(collections):
    licences = collections["licenses"]
    return [c.args[0] for c in licences.count_documents.call_args_list] + [c.args[0] for c in licences.find.call_args_list]


def test_a_club_admin_dashboard_counts_its_club_licences(db):
    database, collections = db

    response = stats_as(club_admin(), database)

    assert response.status_code == 200
    filters = licence_filters(collections)
    assert filters
    assert all(f["member_id"] == {"$in": CLUB_MEMBER_IDS} for f in filters)
    assert all("club_id" not in f for f in filters)


def test_expired_licences_are_counted_by_their_date(db):
    database, collections = db

    stats_as(super_admin(), database)

    expired_filter = collections["licenses"].count_documents.call_args.args[0]
    assert "$lt" in expired_filter["expiration_date"]
    assert expired_filter["status"] == {"$ne": "revoked"}


def test_the_dashboard_counts_active_members_with_a_licence_and_an_accident_insurance_in_force(db):
    database, collections = db
    collections["licenses"] = fake_collection()
    collections["licenses"].distinct = AsyncMock(return_value=[CLUB_MEMBER_IDS[0]])
    collections["insurances"] = fake_collection()
    collections["insurances"].distinct = AsyncMock(return_value=CLUB_MEMBER_IDS)

    response = stats_as(club_admin(), database)

    stats = response.json()["stats"]
    assert stats["licensed_members"] == 1
    assert stats["insured_members"] == 2
    licence_query = collections["licenses"].distinct.call_args.args[1]
    assert licence_query["member_id"] == {"$in": CLUB_MEMBER_IDS}
    assert "$gte" in licence_query["expiration_date"]
    assert licence_query["status"] == {"$ne": "revoked"}
    insurance_query = collections["insurances"].distinct.call_args.args[1]
    assert insurance_query["member_id"] == {"$in": CLUB_MEMBER_IDS}
    assert insurance_query["insurance_type"] == "accident"
    assert insurance_query["status"] == {"$ne": "cancelled"}
    assert "$gte" in insurance_query["end_date"] and "$lte" in insurance_query["start_date"]
