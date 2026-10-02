"""A member reads their own licence in the mobile app, and nobody else's."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.member import ClubRole
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_all_licenses_use_case,
    get_auth_context,
    get_generate_license_image_use_case,
    get_license_use_case,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_MEMBER = "member-own"
OTHER_MEMBER = "member-other"
OWN_CLUB = "club-own"


def caller(member_id=None, club_role=None, global_role=GlobalRole.USER) -> AuthContext:
    user = User(
        id="user-id",
        email="user@example.com",
        username="user",
        hashed_password="hash",
        global_role=global_role,
        member_id=member_id,
    )
    member = SimpleNamespace(club_role=club_role, club_id=OWN_CLUB) if member_id else None
    return AuthContext(user=user, member=member)


def plain_member() -> AuthContext:
    return caller(member_id=OWN_MEMBER, club_role=ClubRole.MEMBER)


@pytest.fixture
def use_cases():
    return SimpleNamespace(get_all=AsyncMock(), get_one=AsyncMock(), image=AsyncMock())


@pytest.fixture
def client_as(use_cases):
    app = create_app()

    def build(ctx: AuthContext, licence_owner: str = OWN_MEMBER) -> TestClient:
        use_cases.get_all.execute.return_value = []
        use_cases.get_one.execute.return_value = SimpleNamespace(member_id=licence_owner)
        use_cases.image.execute.return_value = SimpleNamespace(
            image_bytes=b"png", content_type="image/png", filename="licence.png"
        )
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_all_licenses_use_case: lambda: use_cases.get_all,
            get_license_use_case: lambda: use_cases.get_one,
            get_generate_license_image_use_case: lambda: use_cases.image,
        }
        return TestClient(app)

    return build


def test_a_member_lists_their_own_licences(client_as, use_cases):
    response = client_as(plain_member()).get(f"/api/v1/licenses/member/{OWN_MEMBER}")

    assert response.status_code == status.HTTP_200_OK
    assert use_cases.get_all.execute.call_args.kwargs["member_id"] == OWN_MEMBER


def test_a_member_is_refused_the_licences_of_another_member(client_as, use_cases):
    response = client_as(plain_member()).get(f"/api/v1/licenses/member/{OTHER_MEMBER}")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.get_all.execute.assert_not_called()


def test_a_member_downloads_the_image_of_their_own_licence(client_as):
    response = client_as(plain_member()).get("/api/v1/licenses/licence-id/image")

    assert response.status_code == status.HTTP_200_OK
    assert response.content == b"png"


def test_another_members_licence_image_looks_like_a_missing_one(client_as, use_cases):
    response = client_as(plain_member(), licence_owner=OTHER_MEMBER).get("/api/v1/licenses/licence-id/image")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    use_cases.image.execute.assert_not_called()


def test_a_member_whose_club_is_missing_still_lists_their_own_licences(client_as):
    ctx = plain_member()
    ctx.member.club_id = None

    response = client_as(ctx).get(f"/api/v1/licenses/member/{OWN_MEMBER}")

    assert response.status_code == status.HTTP_200_OK


def test_a_user_with_no_member_is_refused_both(client_as, use_cases):
    client = client_as(caller())

    assert client.get(f"/api/v1/licenses/member/{OTHER_MEMBER}").status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/api/v1/licenses/licence-id/image").status_code == status.HTTP_403_FORBIDDEN
    use_cases.get_one.execute.assert_not_called()
    use_cases.image.execute.assert_not_called()


@pytest.mark.parametrize("ctx", [
    caller(member_id="member-admin", club_role=ClubRole.ADMIN),
    caller(global_role=GlobalRole.SUPER_ADMIN),
])
def test_admins_keep_reading_licences_of_other_members(client_as, ctx):
    client = client_as(ctx, licence_owner=OTHER_MEMBER)

    assert client.get(f"/api/v1/licenses/member/{OTHER_MEMBER}").status_code == status.HTTP_200_OK
    assert client.get("/api/v1/licenses/licence-id/image").status_code == status.HTTP_200_OK


def test_a_member_is_still_refused_the_rest_of_the_licence_routes(client_as):
    client = client_as(plain_member())

    assert client.get("/api/v1/licenses").status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/api/v1/licenses/licence-id").status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/api/v1/licenses/expiring").status_code == status.HTTP_403_FORBIDDEN
