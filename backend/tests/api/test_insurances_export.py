"""The insurance export carries the member's birth date."""

from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock

import openpyxl
import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.entities.member import Member
from src.infrastructure.web.dependencies import (
    get_all_insurances_use_case,
    get_auth_context,
    get_member_repository,
)
from src.infrastructure.web.routers.import_export import router
from tests.api.callers import OWN_CLUB, super_admin

pytestmark = [pytest.mark.api]

BORN = "member-born"
UNBORN = "member-without-birth-date"


def insurance_of(member_id: str) -> Insurance:
    return Insurance(
        id=f"insurance-{member_id}",
        member_id=member_id,
        insurance_type=InsuranceType.ACCIDENT,
        policy_number=f"POL-{member_id}",
        insurance_company="Aseguradora Example",
    )


MEMBERS = {
    BORN: Member(id=BORN, first_name="Ana", last_name="Example Test", dni="00000000T",
                 club_id=OWN_CLUB, birth_date=datetime(1990, 3, 7)),
    UNBORN: Member(id=UNBORN, first_name="Luis", last_name="Example Demo", dni="11111111H",
                   club_id=OWN_CLUB),
}


@pytest.fixture
def client() -> TestClient:
    get_all = SimpleNamespace(execute=AsyncMock(return_value=[insurance_of(BORN), insurance_of(UNBORN)]))
    member_repository = SimpleNamespace(find_by_id=AsyncMock(side_effect=MEMBERS.get))
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: super_admin,
        get_all_insurances_use_case: lambda: get_all,
        get_member_repository: lambda: member_repository,
    }
    return TestClient(app)


def exported_birth_dates(client: TestClient) -> dict:
    response = client.get("/api/v1/import-export/insurances/export")
    assert response.status_code == status.HTTP_200_OK
    rows = list(openpyxl.load_workbook(BytesIO(response.content)).active.iter_rows(values_only=True))
    header = rows[0]
    return {row[header.index("Nº Póliza")]: row[header.index("Fecha Nacimiento")] for row in rows[1:]}


def test_the_export_carries_the_member_birth_date(client):
    assert exported_birth_dates(client)[f"POL-{BORN}"] == "07/03/1990"


def test_a_member_without_birth_date_exports_an_empty_cell(client):
    assert exported_birth_dates(client)[f"POL-{UNBORN}"] in ("", None)
