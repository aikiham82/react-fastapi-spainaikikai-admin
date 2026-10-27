"""The club record's email is no longer asked for."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.club import Club
from src.infrastructure.web.dependencies import get_auth_context, get_create_club_use_case, get_update_club_use_case
from src.infrastructure.web.dto.club_dto import ClubUpdate
from src.infrastructure.web.routers.clubs import router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.unit, pytest.mark.api]


def test_a_club_is_created_without_an_email():
    use_case = MagicMock()
    use_case.execute = AsyncMock(side_effect=lambda **kw: Club(id="club-1", **kw))
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_auth_context] = super_admin
    app.dependency_overrides[get_create_club_use_case] = lambda: use_case

    response = TestClient(app).post("/api/v1/clubs", json={
        "name": "Dojo Ejemplo", "address": "", "city": "", "province": "", "postal_code": "", "country": "", "phone": "",
    })

    assert response.status_code == 201
    assert response.json()["email"] in ("", None)


def test_an_edit_without_email_keeps_the_stored_one():
    assert "email" not in ClubUpdate(name="Dojo Ejemplo").model_dump(exclude_none=True)
