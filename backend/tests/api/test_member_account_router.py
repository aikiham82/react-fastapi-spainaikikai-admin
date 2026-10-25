"""API tests for giving a member web access."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.user import EmailAlreadyInUseError, UserAlreadyExistsError
from src.application.use_cases.password_reset import AdminPasswordResetLinkResult
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_grant_member_access_use_case,
    get_member_use_case,
)
from src.infrastructure.web.routers.members import router

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"
LINK = AdminPasswordResetLinkResult(
    url="https://admin.example.com/reset-password?token=abc",
    email="ana@example.com",
    expires_at=datetime(2026, 10, 26, 20, 0),
)


def a_user(global_role=GlobalRole.USER) -> User:
    return User(id="caller", email="caller@example.com", username="caller", hashed_password="h", global_role=global_role)


def super_admin() -> AuthContext:
    return AuthContext(user=a_user(GlobalRole.SUPER_ADMIN))


def club_admin() -> AuthContext:
    return AuthContext(user=a_user(), member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id=OWN_CLUB))


def plain_member() -> AuthContext:
    return AuthContext(user=a_user(), member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id=OWN_CLUB))


@pytest.fixture
def grant():
    use_case = SimpleNamespace(execute=AsyncMock(return_value=LINK))
    return use_case


@pytest.fixture
def client_as(grant):
    def build(ctx: AuthContext, member_club=OWN_CLUB) -> TestClient:
        get_one = SimpleNamespace(execute=AsyncMock(return_value=Member(
            id="member-1", first_name="Ana", last_name="Ejemplo", club_id=member_club
        )))
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_use_case: lambda: get_one,
            get_grant_member_access_use_case: lambda: grant,
        }
        return TestClient(app)

    return build


def give_access(client: TestClient, club_admin_flag=False):
    return client.post(
        "/api/v1/members/member-1/account",
        json={"email": "ana@example.com", "club_admin": club_admin_flag},
    )


class TestGiveMemberAccess:

    def test_a_club_admin_gives_access_to_a_member_of_their_club(self, client_as, grant):
        response = give_access(client_as(club_admin()), club_admin_flag=True)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["url"] == LINK.url
        grant.execute.assert_awaited_once_with(
            member_id="member-1", email="ana@example.com", make_club_admin=True, issued_by="caller"
        )

    def test_the_super_admin_gives_access_in_any_club(self, client_as):
        response = give_access(client_as(super_admin(), member_club=OTHER_CLUB))

        assert response.status_code == status.HTTP_201_CREATED

    def test_a_club_admin_cannot_touch_another_club(self, client_as, grant):
        response = give_access(client_as(club_admin(), member_club=OTHER_CLUB))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        grant.execute.assert_not_awaited()

    def test_a_plain_member_cannot_give_access(self, client_as, grant):
        response = give_access(client_as(plain_member()))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        grant.execute.assert_not_awaited()

    def test_an_email_another_account_uses_is_a_conflict(self, client_as, grant):
        grant.execute.side_effect = EmailAlreadyInUseError("ana@example.com")

        response = give_access(client_as(club_admin()))

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "Ese correo ya lo usa otra cuenta"

    def test_a_member_with_an_account_is_a_conflict(self, client_as, grant):
        grant.execute.side_effect = UserAlreadyExistsError("already")

        response = give_access(client_as(club_admin()))

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "Este socio ya tiene acceso a la web"

    def test_a_malformed_email_is_refused(self, client_as, grant):
        response = client_as(club_admin()).post(
            "/api/v1/members/member-1/account", json={"email": "not-an-email"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        grant.execute.assert_not_awaited()
