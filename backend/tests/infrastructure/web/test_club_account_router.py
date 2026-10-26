"""Who may pass a club's shared account onto a person, and what each refusal answers."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.user import User
from src.domain.exceptions.member import InvalidClubForMemberError
from src.domain.exceptions.user import ClubAccountNotFoundError, UserAlreadyExistsError
from src.infrastructure.web.dependencies import get_auth_context, get_transfer_club_account_use_case
from src.infrastructure.web.routers.clubs import router
from tests.api.callers import club_admin, super_admin

pytestmark = [pytest.mark.unit, pytest.mark.api]

TRANSFER = "/api/v1/clubs/club-1/account/transfer"


def client_as(ctx, use_case) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_auth_context] = lambda: ctx
    app.dependency_overrides[get_transfer_club_account_use_case] = lambda: use_case
    return TestClient(app)


def transfer_returning(result) -> MagicMock:
    use_case = MagicMock()
    use_case.execute = AsyncMock(side_effect=result) if isinstance(result, Exception) else AsyncMock(return_value=result)
    return use_case


def test_a_super_admin_passes_the_club_account_to_a_member():
    account = User(id="club-user", email="dojo@example.com", username="DOJO EJEMPLO", hashed_password="h", member_id="person-1")
    use_case = transfer_returning(account)

    response = client_as(super_admin(), use_case).post(TRANSFER, json={"member_id": "person-1"})

    assert response.status_code == 200
    assert response.json()["member_id"] == "person-1"
    assert "hashed_password" not in response.json()
    use_case.execute.assert_awaited_once_with("club-1", "person-1")


def test_a_club_admin_is_refused():
    use_case = transfer_returning(None)

    response = client_as(club_admin(club_id="club-1"), use_case).post(TRANSFER, json={"member_id": "person-1"})

    assert response.status_code == 403
    use_case.execute.assert_not_called()


@pytest.mark.parametrize("error, status_code", [
    (ClubAccountNotFoundError("club-1"), 404),
    (InvalidClubForMemberError("x"), 422),
    (UserAlreadyExistsError("x"), 409),
])
def test_each_refusal_has_its_status(error, status_code):
    response = client_as(super_admin(), transfer_returning(error)).post(TRANSFER, json={"member_id": "person-1"})

    assert response.status_code == status_code
