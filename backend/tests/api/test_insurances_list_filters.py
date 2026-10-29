"""The insurance list honours the type and status filters, status following the dates."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import get_all_insurances_use_case, get_auth_context
from src.infrastructure.web.routers import insurances as insurances_router

pytestmark = [pytest.mark.api]

IN_FORCE = datetime(2099, 9, 30, 23, 59, 59)
PAST = datetime(2025, 9, 30, 23, 59, 59)


def insurance(insurance_id: str, insurance_type: InsuranceType, end_date: datetime) -> Insurance:
    return Insurance(
        id=insurance_id,
        member_id=f"member-{insurance_id}",
        insurance_type=insurance_type,
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=datetime(2024, 10, 1),
        end_date=end_date,
    )


STORED = [
    insurance("accident-in-force", InsuranceType.ACCIDENT, IN_FORCE),
    insurance("accident-expired", InsuranceType.ACCIDENT, PAST),
    insurance("rc-in-force", InsuranceType.CIVIL_LIABILITY, IN_FORCE),
    insurance("rc-expired", InsuranceType.CIVIL_LIABILITY, PAST),
]


@pytest.fixture
def client(monkeypatch):
    async def unchanged(items):
        return items

    monkeypatch.setattr(insurances_router, "_populate_member_names", unchanged)
    get_all = SimpleNamespace(execute=AsyncMock(return_value=STORED))
    super_admin = AuthContext(
        user=User(
            id="user-id",
            email="admin@example.com",
            username="admin",
            hashed_password="hash",
            global_role=GlobalRole.SUPER_ADMIN,
        )
    )
    app = FastAPI()
    app.include_router(insurances_router.router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin,
        get_all_insurances_use_case: lambda: get_all,
    }
    return TestClient(app)


def listed(client: TestClient, **params) -> dict:
    response = client.get("/api/v1/insurances", params=params)
    assert response.status_code == 200
    return response.json()


def ids(body: dict) -> set:
    return {item["id"] for item in body["items"]}


def test_accident_type_lists_only_accident_insurances(client):
    assert ids(listed(client, insurance_type="accident")) == {"accident-in-force", "accident-expired"}


def test_civil_liability_type_lists_only_rc_insurances(client):
    assert ids(listed(client, insurance_type="civil_liability")) == {"rc-in-force", "rc-expired"}


def test_active_status_leaves_out_an_insurance_whose_end_date_passed(client):
    assert ids(listed(client, status="active")) == {"accident-in-force", "rc-in-force"}


def test_expired_status_lists_an_insurance_stored_active_whose_end_date_passed(client):
    assert ids(listed(client, status="expired")) == {"accident-expired", "rc-expired"}


def test_type_and_status_combine(client):
    assert ids(listed(client, insurance_type="accident", status="expired")) == {"accident-expired"}


def test_total_counts_the_filtered_insurances(client):
    assert listed(client, insurance_type="civil_liability", status="active")["total"] == 1


def test_no_filter_lists_every_insurance(client):
    body = listed(client)
    assert ids(body) == {item.id for item in STORED}
    assert body["total"] == len(STORED)


def test_unknown_type_is_rejected(client):
    assert client.get("/api/v1/insurances", params={"insurance_type": "fire"}).status_code == 422
