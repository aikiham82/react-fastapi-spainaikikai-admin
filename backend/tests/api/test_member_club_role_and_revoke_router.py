"""API tests for changing who manages a club and removing a member's access."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.member import LastClubAdminError
from src.domain.exceptions.user import AccessChangeNotAllowedError, UserNotFoundError
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_member_use_case,
    get_revoke_member_access_use_case,
    get_set_member_club_role_use_case,
)
from src.infrastructure.web.routers.members import router

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"


def caller(global_role=GlobalRole.USER) -> User:
    return User(id="caller", email="caller@example.com", username="caller", hashed_password="h",
                global_role=global_role, member_id="member-caller")


def club_admin() -> AuthContext:
    return AuthContext(user=caller(), member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id=OWN_CLUB))


def plain_member() -> AuthContext:
    return AuthContext(user=caller(), member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id=OWN_CLUB))


def super_admin() -> AuthContext:
    return AuthContext(user=caller(GlobalRole.SUPER_ADMIN))


@pytest.fixture
def use_cases():
    stored = Member(id="member-1", first_name="Ana", last_name="Ejemplo", club_id=OWN_CLUB, club_role=ClubRole.ADMIN)
    return SimpleNamespace(
        set_role=SimpleNamespace(execute=AsyncMock(return_value=stored)),
        revoke=SimpleNamespace(execute=AsyncMock(return_value=None)),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx: AuthContext, member_club=OWN_CLUB) -> TestClient:
        get_one = SimpleNamespace(execute=AsyncMock(return_value=Member(
            id="member-1", first_name="Ana", last_name="Ejemplo", club_id=member_club
        )))
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_use_case: lambda: get_one,
            get_set_member_club_role_use_case: lambda: use_cases.set_role,
            get_revoke_member_access_use_case: lambda: use_cases.revoke,
        }
        return TestClient(app)

    return build


def make_admin(client):
    return client.patch("/api/v1/members/member-1/club-role", json={"club_role": "admin"})


def revoke(client):
    return client.delete("/api/v1/members/member-1/account")


class TestClubRoleAndRevoke:

    def test_a_club_admin_changes_roles_and_access_in_their_club(self, client_as, use_cases):
        client = client_as(club_admin())

        assert make_admin(client).status_code == status.HTTP_200_OK
        assert revoke(client).status_code == status.HTTP_204_NO_CONTENT
        use_cases.set_role.execute.assert_awaited_once_with("member-1", ClubRole.ADMIN, changed_by_member_id="member-caller")
        use_cases.revoke.execute.assert_awaited_once_with("member-1", revoked_by_member_id="member-caller")

    def test_the_super_admin_does_it_in_any_club(self, client_as):
        client = client_as(super_admin(), member_club=OTHER_CLUB)

        assert make_admin(client).status_code == status.HTTP_200_OK
        assert revoke(client).status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.parametrize("ctx, member_club", [(club_admin, OTHER_CLUB), (plain_member, OWN_CLUB)])
    def test_anyone_else_is_refused(self, client_as, use_cases, ctx, member_club):
        client = client_as(ctx(), member_club=member_club)

        assert make_admin(client).status_code == status.HTTP_403_FORBIDDEN
        assert revoke(client).status_code == status.HTTP_403_FORBIDDEN
        use_cases.set_role.execute.assert_not_awaited()
        use_cases.revoke.execute.assert_not_awaited()

    def test_an_unknown_role_is_refused(self, client_as):
        response = client_as(club_admin()).patch("/api/v1/members/member-1/club-role", json={"club_role": "owner"})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_leaving_the_club_without_admins_is_a_conflict(self, client_as, use_cases):
        use_cases.set_role.execute.side_effect = LastClubAdminError("last")
        use_cases.revoke.execute.side_effect = LastClubAdminError("last")
        client = client_as(club_admin())

        for response in (client.patch("/api/v1/members/member-1/club-role", json={"club_role": "member"}), revoke(client)):
            assert response.status_code == status.HTTP_409_CONFLICT
            assert response.json()["detail"] == "El club tiene que tener al menos un responsable"

    def test_own_or_federation_access_cannot_be_removed(self, client_as, use_cases):
        use_cases.revoke.execute.side_effect = AccessChangeNotAllowedError("no")

        response = revoke(client_as(club_admin()))

        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "No puedes quitar este acceso"

    def test_removing_access_of_a_member_without_account_is_not_found(self, client_as, use_cases):
        use_cases.revoke.execute.side_effect = UserNotFoundError("member:member-1")

        assert revoke(client_as(club_admin())).status_code == status.HTTP_404_NOT_FOUND
