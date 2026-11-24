"""An imported insurance row updates the insurance of its own member: a policy number is shared by many."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.entities.member import Member
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_create_insurance_use_case,
    get_insurance_repository,
    get_member_repository,
    get_update_insurance_use_case,
)
from src.infrastructure.web.routers.import_export import router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]


def pending(insurance_id: str, member_id: str, insurance_type: InsuranceType, season_start_year: int) -> Insurance:
    return Insurance(
        id=insurance_id,
        member_id=member_id,
        insurance_type=insurance_type,
        policy_number="PENDIENTE",
        insurance_company="Example Seguros",
        start_date=datetime(season_start_year, 10, 1),
        end_date=datetime(season_start_year + 1, 9, 30),
    )


HELD = [
    pending("bea-accident", "member-bea", InsuranceType.ACCIDENT, 2026),
    pending("ana-liability", "member-ana", InsuranceType.CIVIL_LIABILITY, 2026),
    pending("ana-accident-2025", "member-ana", InsuranceType.ACCIDENT, 2025),
    pending("ana-accident-2026", "member-ana", InsuranceType.ACCIDENT, 2026),
]


@pytest.fixture
def create():
    return SimpleNamespace(execute=AsyncMock())


@pytest.fixture
def update():
    return SimpleNamespace(execute=AsyncMock())


@pytest.fixture
def client(create, update) -> TestClient:
    ana = Member(id="member-ana", first_name="Ana", last_name="Example", club_id="club-dojo")
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_create_insurance_use_case: lambda: create,
        get_update_insurance_use_case: lambda: update,
        get_insurance_repository: lambda: SimpleNamespace(find_all_by_policy_number=AsyncMock(return_value=HELD)),
        get_member_repository: lambda: SimpleNamespace(find_by_dni=AsyncMock(return_value=ana)),
    }
    return TestClient(app)


def import_row(client: TestClient, **cells) -> dict:
    row = {"policy_number": "PENDIENTE", "dni": "00000000A", "insurance_company": "Example Seguros", **cells}
    return client.post("/api/v1/import-export/insurances/import", json={"insurances": [row], "mode": "upsert"}).json()


def test_a_row_updates_the_insurance_of_its_member_type_and_season(client, create, update):
    result = import_row(client, insurance_type="accident", start_date="2026-10-01", end_date="2027-12-31")

    assert result["updated"] == 1
    assert update.execute.call_args.kwargs["insurance_id"] == "ana-accident-2026"
    create.execute.assert_not_called()


def test_a_row_for_a_season_the_member_does_not_hold_creates_it(client, create, update):
    result = import_row(client, insurance_type="accident", start_date="2027-10-01", end_date="2028-09-30")

    assert result["imported"] == 1
    assert create.execute.call_args.kwargs["member_id"] == "member-ana"
    update.execute.assert_not_called()


def test_a_row_that_fits_several_insurances_is_an_error_and_changes_none(client, create, update):
    result = import_row(client, insurance_type="accident", end_date="2027-12-31")

    assert result["errors"] == ["Fila 1: Varios seguros coinciden con esta fila; indica la fecha de inicio"]
    update.execute.assert_not_called()
    create.execute.assert_not_called()
