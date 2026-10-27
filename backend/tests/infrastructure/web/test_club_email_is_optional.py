"""The club record's email is no longer asked for."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.application.use_cases.club.update_club_use_case import UpdateClubUseCase
from src.domain.entities.club import Club
from src.infrastructure.web.dependencies import get_auth_context, get_create_club_use_case, get_update_club_use_case
from src.infrastructure.web.routers.clubs import router
from tests.api.callers import super_admin

pytestmark = [pytest.mark.unit, pytest.mark.api]


def _app() -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_auth_context] = super_admin
    return app


def test_a_club_is_created_without_an_email():
    use_case = MagicMock()
    use_case.execute = AsyncMock(side_effect=lambda **kw: Club(id="club-1", **kw))
    app = _app()
    app.dependency_overrides[get_create_club_use_case] = lambda: use_case

    response = TestClient(app).post("/api/v1/clubs", json={
        "name": "Dojo Ejemplo", "address": "", "city": "", "province": "", "postal_code": "", "country": "", "phone": "",
        "website": "https://dojo.example.com",
    })

    assert response.status_code == 201
    assert response.json()["email"] in ("", None)
    assert response.json()["website"] == "https://dojo.example.com"


def test_an_edit_without_email_keeps_the_stored_one():
    stored = Club(id="club-1", name="Dojo Ejemplo", email="dojo@example.com")
    repository = MagicMock()
    repository.find_by_id = AsyncMock(return_value=stored)
    repository.update = AsyncMock(side_effect=lambda club: club)
    app = _app()
    app.dependency_overrides[get_update_club_use_case] = lambda: UpdateClubUseCase(repository)

    response = TestClient(app).put("/api/v1/clubs/club-1", json={"name": "Dojo Renombrado"})

    assert response.status_code == 200
    assert response.json()["email"] == "dojo@example.com"
