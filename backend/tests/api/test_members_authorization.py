"""API tests for who may read and change members."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_auth_context,
    get_change_member_status_use_case,
    get_club_repository,
    get_create_member_use_case,
    get_delete_member_use_case,
    get_insurance_repository,
    get_license_repository,
    get_member_use_case,
    get_search_members_use_case,
    get_update_member_use_case,
)
from src.infrastructure.web.routers.members import router

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"


def user(global_role=GlobalRole.USER) -> User:
    return User(
        id="user-id",
        email="user@example.com",
        username="user",
        hashed_password="hash",
        global_role=global_role,
    )


def super_admin() -> AuthContext:
    return AuthContext(user=user(GlobalRole.SUPER_ADMIN))


def club_admin() -> AuthContext:
    return AuthContext(user=user(), member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id=OWN_CLUB))


def plain_member() -> AuthContext:
    return AuthContext(user=user(), member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id=OWN_CLUB))


def user_without_member() -> AuthContext:
    return AuthContext(user=user())


def member_of(club_id, member_id="member-id") -> Member:
    return Member(id=member_id, first_name="Ana", last_name="Example", club_id=club_id)


@pytest.fixture
def use_cases():
    return SimpleNamespace(
        get_all=AsyncMock(),
        get_one=AsyncMock(),
        search=AsyncMock(),
        create=AsyncMock(),
        update=AsyncMock(),
        delete=AsyncMock(),
        change_status=AsyncMock(),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx: AuthContext, stored_club=OWN_CLUB) -> TestClient:
        stored = member_of(stored_club)
        everyone = [member_of(OWN_CLUB, "member-own"), member_of(OTHER_CLUB, "member-foreign")]
        use_cases.get_all.execute.return_value = [stored]
        use_cases.search.execute.return_value = everyone
        use_cases.get_one.execute.return_value = stored
        use_cases.create.execute.return_value = stored
        use_cases.update.execute.return_value = stored
        use_cases.change_status.execute.return_value = stored

        empty_repository = SimpleNamespace(
            find_by_member_ids=AsyncMock(return_value=[]),
            find_by_ids=AsyncMock(return_value=[]),
        )
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_all_members_use_case: lambda: use_cases.get_all,
            get_member_use_case: lambda: use_cases.get_one,
            get_search_members_use_case: lambda: use_cases.search,
            get_create_member_use_case: lambda: use_cases.create,
            get_update_member_use_case: lambda: use_cases.update,
            get_delete_member_use_case: lambda: use_cases.delete,
            get_change_member_status_use_case: lambda: use_cases.change_status,
            get_license_repository: lambda: empty_repository,
            get_insurance_repository: lambda: empty_repository,
            get_club_repository: lambda: empty_repository,
        }
        return TestClient(app)

    return build


def every_request(client: TestClient, club_id=OWN_CLUB):
    return {
        "list": client.get("/api/v1/members"),
        "list with search": client.get("/api/v1/members?search=ana"),
        "search": client.get("/api/v1/members/search?name=ana"),
        "by club": client.get(f"/api/v1/members/club/{club_id}"),
        "detail": client.get("/api/v1/members/member-id"),
        "create": client.post("/api/v1/members", json={"first_name": "Ana", "club_id": club_id}),
        "update": client.put("/api/v1/members/member-id", json={"phone": "600000000"}),
        "status": client.patch("/api/v1/members/member-id/status", json={"status": "inactive"}),
        "delete": client.delete("/api/v1/members/member-id"),
    }


def refused(responses) -> dict:
    return {name: status.HTTP_403_FORBIDDEN for name in responses}


def codes(responses) -> dict:
    return {name: response.status_code for name, response in responses.items()}


@pytest.mark.parametrize("ctx_factory", [plain_member, user_without_member])
def test_a_user_who_administers_no_club_is_refused_everywhere(client_as, use_cases, ctx_factory):
    responses = every_request(client_as(ctx_factory()))

    assert codes(responses) == refused(responses)
    for use_case in vars(use_cases).values():
        use_case.execute.assert_not_called()


@pytest.mark.parametrize("stored_club", [OTHER_CLUB, None])
def test_a_club_admin_is_refused_a_member_outside_their_club(client_as, use_cases, stored_club):
    responses = every_request(client_as(club_admin(), stored_club=stored_club), club_id=OTHER_CLUB)
    for scoped_to_own_club in ("list", "list with search", "search"):
        del responses[scoped_to_own_club]

    assert codes(responses) == refused(responses)
    use_cases.create.execute.assert_not_called()
    use_cases.update.execute.assert_not_called()
    use_cases.change_status.execute.assert_not_called()
    use_cases.delete.execute.assert_not_called()


def test_a_club_admin_cannot_move_a_member_to_another_club(client_as, use_cases):
    response = client_as(club_admin()).put("/api/v1/members/member-id", json={"club_id": OTHER_CLUB})

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.update.execute.assert_not_called()


def test_a_club_admin_lists_only_their_own_club(client_as, use_cases):
    response = client_as(club_admin()).get(f"/api/v1/members?club_id={OTHER_CLUB}")

    assert response.status_code == status.HTTP_200_OK
    use_cases.get_all.execute.assert_called_once_with(0, OWN_CLUB)


@pytest.mark.parametrize("path", ["/api/v1/members?search=ana", "/api/v1/members/search?name=ana"])
def test_a_club_admin_searches_only_their_own_club(client_as, path):
    response = client_as(club_admin()).get(path)

    assert response.status_code == status.HTTP_200_OK
    assert [member["id"] for member in response.json()] == ["member-own"]


def test_a_club_admin_creates_members_in_their_own_club(client_as, use_cases):
    response = client_as(club_admin()).post("/api/v1/members", json={"first_name": "Ana"})

    assert response.status_code == status.HTTP_201_CREATED
    assert use_cases.create.execute.call_args.kwargs["club_id"] == OWN_CLUB


def test_a_club_admin_works_with_members_of_their_own_club(client_as):
    responses = every_request(client_as(club_admin()))

    assert codes(responses) == {
        "list": status.HTTP_200_OK,
        "list with search": status.HTTP_200_OK,
        "search": status.HTTP_200_OK,
        "by club": status.HTTP_200_OK,
        "detail": status.HTTP_200_OK,
        "create": status.HTTP_201_CREATED,
        "update": status.HTTP_200_OK,
        "status": status.HTTP_200_OK,
        "delete": status.HTTP_204_NO_CONTENT,
    }


@pytest.mark.parametrize("stored_club", [OTHER_CLUB, None])
def test_a_super_admin_works_with_members_of_any_club(client_as, stored_club):
    responses = every_request(client_as(super_admin(), stored_club=stored_club), club_id=OTHER_CLUB)

    assert all(response.status_code < 300 for response in responses.values())


def test_a_super_admin_searches_across_clubs(client_as):
    response = client_as(super_admin()).get("/api/v1/members/search?name=ana")

    assert [member["id"] for member in response.json()] == ["member-own", "member-foreign"]
