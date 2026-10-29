"""The licence search matches the typed text literally, never as a pattern."""

import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.license import License
from src.infrastructure.adapters.repositories.mongodb_member_repository import MongoDBMemberRepository
from src.infrastructure.web.dependencies import get_all_licenses_use_case, get_auth_context, get_member_repository
from src.infrastructure.web.routers import licenses as licenses_router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]

MEMBERS = [
    {"_id": "member-junior", "first_name": "Carlos", "last_name": "García (Jr)", "status": "active"},
    {"_id": "member-other", "first_name": "Carla", "last_name": "Gómez", "status": "active"},
    {"_id": "member-accented", "first_name": "Lucía", "last_name": "Fernández Soto", "status": "active"},
]


class MembersCollection:
    def find(self, query, projection=None):
        def matches(member):
            return all(
                any(
                    re.search(condition[field]["$regex"], member[field], re.IGNORECASE)
                    for condition in word["$or"]
                    for field in condition
                )
                for word in query["$and"]
            )

        cursor = MagicMock()
        cursor.limit.return_value = cursor
        cursor.to_list = AsyncMock(return_value=[member for member in MEMBERS if matches(member)])
        return cursor

    async def find_one(self, query):
        return next((member for member in MEMBERS if member["_id"] == query["_id"]), None)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(licenses_router, "get_database", lambda: {"members": MembersCollection()})
    with patch(
        "src.infrastructure.adapters.repositories.mongodb_member_repository.get_database",
        return_value={"members": MembersCollection()},
    ):
        member_repository = MongoDBMemberRepository()
    get_all = MagicMock()
    get_all.license_repository.find_by_member_ids = AsyncMock(
        side_effect=lambda ids, limit: [
            License(id=f"licence-of-{member_id}", license_number="SA-2026-001", member_id=member_id, grade="6º Kyu")
            for member_id in ids
        ]
    )
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_all_licenses_use_case: lambda: get_all,
        get_member_repository: lambda: member_repository,
    }
    return TestClient(app)


def test_licence_search_with_regex_characters_matches_the_literal_text(client):
    response = client.get("/api/v1/licenses", params={"search": "García (Jr"})

    assert response.status_code == status.HTTP_200_OK
    assert [item["member_name"] for item in response.json()["items"]] == ["Carlos García (Jr)"]


def test_licence_search_by_first_and_last_name_ignores_accents(client):
    response = client.get("/api/v1/licenses", params={"search": "lucia fernandez"})

    assert response.status_code == status.HTTP_200_OK
    assert [item["member_name"] for item in response.json()["items"]] == ["Lucía Fernández Soto"]


def test_a_licence_search_longer_than_100_characters_is_refused(client):
    response = client.get("/api/v1/licenses", params={"search": "a" * 101})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
