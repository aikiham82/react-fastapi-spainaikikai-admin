"""The member list honours the licence filter, the licence status following its dates."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.license import License
from src.domain.entities.member import Member, MemberStatus
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_auth_context,
    get_club_repository,
    get_insurance_repository,
    get_license_repository,
    get_member_repository,
    get_search_members_use_case,
)
from src.infrastructure.web.routers.members import router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]

MEMBERS = [
    Member(id="in-force", first_name="Ana", last_name="Example", club_id="club-a"),
    Member(id="expired", first_name="Luis", last_name="Example", club_id="club-a"),
    Member(id="unlicensed", first_name="Eva", last_name="Example", club_id="club-a"),
    Member(id="deregistered", first_name="Pau", last_name="Example", club_id="club-a", status=MemberStatus.INACTIVE),
]


def licence_as_loaded(member_id: str, expiration_date: datetime) -> License:
    licence = License(
        id=f"licence-{member_id}",
        license_number=f"SA-{member_id}",
        member_id=member_id,
        grade="6º Kyu",
        expiration_date=expiration_date,
    )
    licence.check_and_update_status()
    return licence


LICENCES = [
    licence_as_loaded("in-force", datetime(2099, 12, 31)),
    licence_as_loaded("expired", datetime(2025, 12, 31)),
    licence_as_loaded("deregistered", datetime(2099, 12, 31)),
]


@pytest.fixture
def client():
    licences = SimpleNamespace(find_by_member_ids=AsyncMock(return_value=LICENCES))
    empty = SimpleNamespace(find_by_member_ids=AsyncMock(return_value=[]), find_by_ids=AsyncMock(return_value=[]))
    members = SimpleNamespace(count_by_emails=AsyncMock(return_value={}))
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_all_members_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=list(MEMBERS))),
        get_search_members_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=[])),
        get_license_repository: lambda: licences,
        get_insurance_repository: lambda: empty,
        get_club_repository: lambda: empty,
        get_member_repository: lambda: members,
    }
    return TestClient(app)


def listed_ids(client: TestClient, **params) -> set:
    response = client.get("/api/v1/members", params=params)
    assert response.status_code == 200
    return {member["id"] for member in response.json()}


def test_active_licence_lists_only_members_with_a_licence_in_force(client):
    assert listed_ids(client, license_status="active") == {"in-force", "deregistered"}


def test_expired_licence_lists_a_member_whose_licence_date_passed(client):
    assert listed_ids(client, license_status="expired") == {"expired"}


def test_a_member_without_licence_is_left_out_when_filtering(client):
    assert "unlicensed" not in listed_ids(client, license_status="pending")


def test_no_licence_filter_lists_every_member(client):
    assert listed_ids(client) == {member.id for member in MEMBERS}


def test_licence_filter_combines_with_member_status(client):
    assert listed_ids(client, status="active", license_status="active") == {"in-force"}
