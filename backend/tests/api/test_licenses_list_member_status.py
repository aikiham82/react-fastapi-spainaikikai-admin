"""Each licence in the list says whether its member is still active or de baja."""

from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.license import License
from src.infrastructure.web.dependencies import get_all_licenses_use_case, get_auth_context
from src.infrastructure.web.routers import licenses as licenses_router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]

MEMBERS = {
    "member-active": {"_id": "member-active", "first_name": "Ana", "last_name": "Activa", "status": "active", "dni": "12345678Z"},
    "member-gone": {"_id": "member-gone", "first_name": "Bruno", "last_name": "Baja", "status": "inactive", "dni": ""},
}


class MembersCollection:
    async def find_one(self, query):
        return MEMBERS.get(query["_id"])


def licence_of(member_id) -> License:
    return License(id=f"licence-of-{member_id}", license_number="SA-2025-001", member_id=member_id, grade="6º Kyu")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(licenses_router, "get_database", lambda: {"members": MembersCollection()})
    get_all = AsyncMock()
    get_all.execute.return_value = [licence_of("member-active"), licence_of("member-gone")]
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_all_licenses_use_case: lambda: get_all,
    }
    return TestClient(app)


def test_list_returns_member_status_of_each_licences_member(client):
    response = client.get("/api/v1/licenses")

    assert response.status_code == status.HTTP_200_OK
    assert {item["member_name"]: item["member_status"] for item in response.json()["items"]} == {
        "Ana Activa": "active",
        "Bruno Baja": "inactive",
    }


def test_list_returns_dni_of_each_licences_member_and_none_when_empty(client):
    response = client.get("/api/v1/licenses")

    assert {item["member_name"]: item["member_dni"] for item in response.json()["items"]} == {
        "Ana Activa": "12345678Z",
        "Bruno Baja": None,
    }
