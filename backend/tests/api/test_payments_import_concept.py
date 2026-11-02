"""An imported concept is bounded text, so it cannot break the payments export."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.member import Member
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_member_payment_repository,
    get_member_repository,
)
from src.infrastructure.web.routers.import_export import router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.api]


@pytest.fixture
def payments():
    return SimpleNamespace(create=AsyncMock(), update=AsyncMock(), find_by_member_year=AsyncMock(return_value=[]))


@pytest.fixture
def client(payments) -> TestClient:
    members = SimpleNamespace(find_by_dni=AsyncMock(return_value=Member(id="member-ana", first_name="Ana", last_name="Example", club_id="club-dojo")))
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_member_payment_repository: lambda: payments,
        get_member_repository: lambda: members,
    }
    return TestClient(app)


def import_concept(client: TestClient, concept) -> dict:
    row = {"dni": "00000000A", "tipo_pago": "licencia_kyu", "ano": 2026, "monto": 15, "concepto": concept}
    return client.post("/api/v1/import-export/payments/import", json={"payments": [row]}).json()


@pytest.mark.parametrize(
    ("concept", "stored"),
    [(2026, "2026"), (15.0, "15"), (["a"], "['a']"), ({"a": 1}, "{'a': 1}"), ("  Licencia  ", "Licencia")],
    ids=["int", "whole-float", "list", "dict", "spaces"],
)
def test_a_cell_is_stored_as_text(client, payments, concept, stored):
    import_concept(client, concept)

    assert payments.create.call_args.args[0].concept == stored


def test_a_concept_of_200_characters_is_stored(client, payments):
    result = import_concept(client, "a" * 200)

    assert result["failed"] == 0
    assert len(payments.create.call_args.args[0].concept) == 200


def test_a_longer_concept_is_an_error_for_its_row(client, payments):
    result = import_concept(client, "a" * 201)

    assert result["failed"] == 1
    assert result["errors"] == ["Fila 1: Concepto demasiado largo"]
    payments.create.assert_not_called()


def test_a_long_note_on_a_row_without_dni_is_still_skipped_in_upsert(client):
    row = {"concepto": "a" * 201}

    result = client.post("/api/v1/import-export/payments/import", json={"payments": [row], "mode": "upsert"}).json()

    assert result["failed"] == 0


def test_without_a_concept_it_is_still_built_from_the_type_and_year(client, payments):
    import_concept(client, None)

    assert payments.create.call_args.args[0].concept == "Licencia KYU 2026"
