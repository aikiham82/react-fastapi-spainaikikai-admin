"""API tests for a club admin managing the accounts of their own club."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole, User
from src.application.use_cases.password_reset import AdminPasswordResetLinkResult
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_generate_admin_password_reset_link_use_case,
    get_member_repository,
    get_update_user_email_use_case,
    get_user_by_member_id_use_case,
    get_user_repository,
)
from src.infrastructure.web.routers.users import router

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"

MEMBERS = {
    "member-own": Member(id="member-own", first_name="Ana", last_name="Ejemplo", club_id=OWN_CLUB),
    "member-foreign": Member(id="member-foreign", first_name="Eva", last_name="Ejemplo", club_id=OTHER_CLUB),
    "member-federation": Member(id="member-federation", first_name="Fede", last_name="Ejemplo", club_id=OWN_CLUB),
}
ACCOUNTS = {
    "user-own": User(id="user-own", email="ana@example.com", username="ana", hashed_password="h", member_id="member-own"),
    "user-foreign": User(id="user-foreign", email="eva@example.com", username="eva", hashed_password="h", member_id="member-foreign"),
    "user-federation": User(
        id="user-federation", email="fede@example.com", username="fede", hashed_password="h",
        member_id="member-federation", global_role=GlobalRole.SUPER_ADMIN,
    ),
    "user-unlinked": User(id="user-unlinked", email="nobody@example.com", username="nobody", hashed_password="h"),
}
LINK = AdminPasswordResetLinkResult(url="https://admin.example.com/r?token=t", email="ana@example.com", expires_at=datetime(2026, 10, 26))


def club_admin() -> AuthContext:
    return AuthContext(
        user=User(id="caller", email="caller@example.com", username="caller", hashed_password="h"),
        member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id=OWN_CLUB),
    )


def plain_member() -> AuthContext:
    return AuthContext(
        user=User(id="caller", email="caller@example.com", username="caller", hashed_password="h"),
        member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id=OWN_CLUB),
    )


@pytest.fixture
def use_cases():
    by_member = AsyncMock()
    by_member.execute.side_effect = lambda member_id: next(u for u in ACCOUNTS.values() if u.member_id == member_id)
    update_email = AsyncMock()
    update_email.execute.side_effect = lambda user_id, email: ACCOUNTS[user_id]
    link = AsyncMock()
    link.execute.return_value = LINK
    return SimpleNamespace(by_member=by_member, update_email=update_email, link=link)


@pytest.fixture
def client_as(use_cases):
    def build(ctx: AuthContext) -> TestClient:
        users = SimpleNamespace(find_by_id=AsyncMock(side_effect=lambda user_id: ACCOUNTS.get(user_id)))
        members = SimpleNamespace(find_by_id=AsyncMock(side_effect=lambda member_id: MEMBERS.get(member_id)))
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_user_repository: lambda: users,
            get_member_repository: lambda: members,
            get_user_by_member_id_use_case: lambda: use_cases.by_member,
            get_update_user_email_use_case: lambda: use_cases.update_email,
            get_generate_admin_password_reset_link_use_case: lambda: use_cases.link,
        }
        return TestClient(app)

    return build


def every_request(client: TestClient, member_id: str, user_id: str) -> dict:
    return {
        "read": client.get(f"/api/v1/users/by-member/{member_id}").status_code,
        "correct email": client.patch(f"/api/v1/users/{user_id}/email", json={"email": "new@example.com"}).status_code,
        "issue link": client.post(f"/api/v1/users/{user_id}/password-reset-link").status_code,
    }


class TestClubAdminAccountSupport:

    def test_a_club_admin_manages_an_account_of_their_club(self, client_as):
        codes = every_request(client_as(club_admin()), "member-own", "user-own")

        assert codes == {"read": 200, "correct email": 200, "issue link": 200}

    def test_a_club_admin_cannot_touch_another_club(self, client_as, use_cases):
        codes = every_request(client_as(club_admin()), "member-foreign", "user-foreign")

        assert codes == {"read": 403, "correct email": 403, "issue link": 403}
        use_cases.update_email.execute.assert_not_awaited()
        use_cases.link.execute.assert_not_awaited()

    def test_a_club_admin_cannot_touch_the_super_admin_account(self, client_as, use_cases):
        codes = every_request(client_as(club_admin()), "member-federation", "user-federation")

        assert codes == {"read": 403, "correct email": 403, "issue link": 403}
        use_cases.update_email.execute.assert_not_awaited()
        use_cases.link.execute.assert_not_awaited()

    def test_a_club_admin_cannot_touch_an_account_with_no_member(self, client_as, use_cases):
        client = client_as(club_admin())

        assert client.post("/api/v1/users/user-unlinked/password-reset-link").status_code == status.HTTP_403_FORBIDDEN
        use_cases.link.execute.assert_not_awaited()

    def test_a_plain_member_cannot_manage_accounts(self, client_as, use_cases):
        codes = every_request(client_as(plain_member()), "member-own", "user-own")

        assert codes == {"read": 403, "correct email": 403, "issue link": 403}

    def test_an_unknown_account_is_not_found(self, client_as):
        client = client_as(club_admin())

        assert client.post("/api/v1/users/missing/password-reset-link").status_code == status.HTTP_404_NOT_FOUND
