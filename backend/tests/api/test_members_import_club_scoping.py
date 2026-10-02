"""A club admin imports members into their own club only."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_create_member_use_case,
    get_member_repository,
    get_update_member_use_case,
)
from src.infrastructure.web.routers.import_export import router
from tests.api.callers import OTHER_CLUB, OWN_CLUB, club_admin, super_admin

pytestmark = [pytest.mark.api, pytest.mark.auth]

ROW = {"first_name": "Ana", "email": "ana@example.com", "dni": "00000000T"}
ROW_ERROR = "No puedes importar miembros en otro club"


@pytest.fixture
def use_cases():
    return SimpleNamespace(create=AsyncMock(), update=AsyncMock())


@pytest.fixture
def client_as(use_cases):
    def build(ctx, existing_club=None) -> TestClient:
        existing = SimpleNamespace(id="member-existing", club_id=existing_club) if existing_club else None
        member_repository = SimpleNamespace(
            find_by_id=AsyncMock(return_value=None),
            find_by_dni=AsyncMock(return_value=existing),
            find_by_email=AsyncMock(return_value=None),
        )
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: member_repository,
            get_create_member_use_case: lambda: use_cases.create,
            get_update_member_use_case: lambda: use_cases.update,
        }
        return TestClient(app)

    return build


def import_rows(client: TestClient, rows: list, mode="create"):
    return client.post("/api/v1/import-export/members/import", json={"members": rows, "mode": mode})


def test_a_club_admins_row_without_a_club_lands_in_their_club(client_as, use_cases):
    response = import_rows(client_as(club_admin()), [ROW])

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["imported"] == 1
    assert use_cases.create.execute.call_args.kwargs["club_id"] == OWN_CLUB


def test_a_club_admins_row_naming_another_club_is_rejected(client_as, use_cases):
    response = import_rows(client_as(club_admin()), [{**ROW, "club_id": OTHER_CLUB}, ROW])

    body = response.json()
    assert (body["imported"], body["failed"]) == (1, 1)
    assert body["errors"] == [f"Fila 1: {ROW_ERROR}"]
    assert use_cases.create.execute.call_count == 1


def test_a_club_admin_cannot_overwrite_a_member_of_another_club(client_as, use_cases):
    response = import_rows(client_as(club_admin(), existing_club=OTHER_CLUB), [ROW], mode="upsert")

    body = response.json()
    assert (body["updated"], body["failed"]) == (0, 1)
    assert body["errors"] == [f"Fila 1: {ROW_ERROR}"]
    use_cases.update.execute.assert_not_called()
    use_cases.create.execute.assert_not_called()


def test_a_club_admin_updates_a_member_of_their_club(client_as, use_cases):
    response = import_rows(client_as(club_admin(), existing_club=OWN_CLUB), [ROW], mode="upsert")

    assert response.json()["updated"] == 1
    assert use_cases.update.execute.call_args.kwargs["club_id"] == OWN_CLUB


def test_a_club_admin_with_no_club_cannot_import(client_as, use_cases):
    response = import_rows(client_as(club_admin(club_id=None)), [ROW])

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.create.execute.assert_not_called()


def test_a_super_admin_imports_into_the_club_named_in_the_row(client_as, use_cases):
    response = import_rows(client_as(super_admin()), [{**ROW, "club_id": OTHER_CLUB}])

    assert response.json()["imported"] == 1
    assert use_cases.create.execute.call_args.kwargs["club_id"] == OTHER_CLUB
