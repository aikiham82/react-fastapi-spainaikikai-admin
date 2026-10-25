"""An Excel number cell is imported as text, so the member list can serialise it."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_create_member_use_case,
    get_member_repository,
    get_update_member_use_case,
)
from src.infrastructure.web.routers.import_export import router
from tests.api.callers import OWN_CLUB, club_admin

pytestmark = [pytest.mark.api]

ROW = {"first_name": "Ana", "email": "ana@example.com"}


@pytest.fixture
def use_cases():
    return SimpleNamespace(create=AsyncMock(), update=AsyncMock())


@pytest.fixture
def client_with(use_cases):
    def build(existing=None) -> TestClient:
        member_repository = SimpleNamespace(
            find_by_id=AsyncMock(return_value=None),
            find_by_dni=AsyncMock(return_value=None),
            find_by_email=AsyncMock(return_value=existing),
        )
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: club_admin(),
            get_member_repository: lambda: member_repository,
            get_create_member_use_case: lambda: use_cases.create,
            get_update_member_use_case: lambda: use_cases.update,
        }
        return TestClient(app)

    return build


def import_row(client: TestClient, row: dict, mode="create"):
    return client.post("/api/v1/import-export/members/import", json={"members": [{**ROW, **row}], "mode": mode})


def created_with(use_cases) -> dict:
    return use_cases.create.execute.call_args.kwargs


def test_a_numeric_postal_code_is_stored_as_text(client_with, use_cases):
    import_row(client_with(), {"postal_code": 23001})

    assert created_with(use_cases)["postal_code"] == "23001"


def test_a_four_digit_postal_code_gets_its_leading_zero_back(client_with, use_cases):
    import_row(client_with(), {"Código Postal": 8001})

    assert created_with(use_cases)["postal_code"] == "08001"


def test_numeric_phone_and_dni_are_stored_as_text(client_with, use_cases):
    import_row(client_with(), {"phone": 600123456.0, "dni": 12345678})

    assert (created_with(use_cases)["phone"], created_with(use_cases)["dni"]) == ("600123456", "12345678")


def test_an_upsert_with_a_numeric_postal_code_stores_text(client_with, use_cases):
    existing = SimpleNamespace(id="member-existing", club_id=OWN_CLUB)

    import_row(client_with(existing), {"postal_code": 23001}, mode="upsert")

    assert use_cases.update.execute.call_args.kwargs["postal_code"] == "23001"
