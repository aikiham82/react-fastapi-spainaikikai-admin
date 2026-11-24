"""The status board downloads as Excel with the same columns the screen shows."""

from io import BytesIO

import openpyxl
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.infrastructure.web.routers.import_export import router
from tests.api.callers import club_admin, plain_member, super_admin
from tests.api.test_member_status_board import MEMBERS, YEAR, dependency_overrides

pytestmark = [pytest.mark.api]

HEADERS = [
    "Nombre", "1er Apellido", "2do Apellido", "Club", f"Licencia {YEAR} pagada",
    "Miembro", "Licencia", "Accidentes", "RC",
]


def export(ctx):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = dependency_overrides(ctx)
    return TestClient(app).get(
        "/api/v1/import-export/members/status-board/export", params={"payment_year": YEAR}
    )


@pytest.fixture
def sheet():
    response = export(super_admin())
    assert response.status_code == 200
    rows = list(openpyxl.load_workbook(BytesIO(response.content)).active.iter_rows(values_only=True))
    return rows[0], {row[0]: row for row in rows[1:]}


def test_the_sheet_has_the_board_columns(sheet):
    headers, _ = sheet
    assert list(headers) == HEADERS


def test_one_row_per_member(sheet):
    _, rows = sheet
    assert set(rows) == {m.first_name for m in MEMBERS}


def test_a_paid_member_in_force(sheet):
    _, rows = sheet
    assert rows["Ana"] == ("Ana", "Example", "One", "Dojo Example A", "Sí", "Activo", "Vigente", "Vigente", "Sin seguro")


def test_an_unpaid_licence_in_force(sheet):
    _, rows = sheet
    assert rows["Luis"][4:7] == ("No", "Activo", "Vigente")


def test_a_member_without_licence_or_insurance(sheet):
    _, rows = sheet
    assert rows["Eva"][4:] == ("No", "Activo", "Sin licencia", "Sin seguro", "Sin seguro")


def test_a_deregistered_member(sheet):
    _, rows = sheet
    assert rows["Noa"][5] == "De baja"


@pytest.mark.parametrize("ctx", [club_admin, plain_member])
def test_only_a_super_admin_downloads_it(ctx):
    assert export(ctx()).status_code == 403
