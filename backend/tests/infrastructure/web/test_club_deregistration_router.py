"""Who may deregister a club and what the API answers."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.application.use_cases.club.deregister_club_use_case import DeregisteredClub
from src.domain.exceptions.club import ClubNotFoundError
from src.infrastructure.web.dependencies import get_auth_context, get_deregister_club_use_case
from src.infrastructure.web.routers.clubs import router
from tests.api.callers import club_admin, super_admin

pytestmark = [pytest.mark.unit, pytest.mark.api]

DEREGISTER = "/api/v1/clubs/club-1/deregister"


def client_as(ctx, outcome) -> tuple:
    use_case = MagicMock()
    use_case.execute = AsyncMock(side_effect=outcome) if isinstance(outcome, Exception) else AsyncMock(return_value=outcome)
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_auth_context] = lambda: ctx
    app.dependency_overrides[get_deregister_club_use_case] = lambda: use_case
    return TestClient(app), use_case


def test_a_super_admin_deregisters_a_club():
    client, use_case = client_as(super_admin(), DeregisteredClub(members=4, accounts=1))

    response = client.post(DEREGISTER)

    assert response.status_code == 200
    assert response.json() == {"members": 4, "accounts": 1}
    use_case.execute.assert_awaited_once_with("club-1")


def test_a_club_admin_may_not_deregister_a_club():
    client, use_case = client_as(club_admin(club_id="club-1"), DeregisteredClub(members=0, accounts=0))

    assert client.post(DEREGISTER).status_code == 403
    use_case.execute.assert_not_called()


def test_an_unknown_club_answers_404():
    client, _ = client_as(super_admin(), ClubNotFoundError("club-1"))

    assert client.post(DEREGISTER).status_code == 404


def test_editing_a_club_cannot_switch_it_off():
    from src.infrastructure.web.dto.club_dto import ClubUpdate

    assert "is_active" not in ClubUpdate(is_active=False, name="Dojo").model_dump(exclude_none=True)
