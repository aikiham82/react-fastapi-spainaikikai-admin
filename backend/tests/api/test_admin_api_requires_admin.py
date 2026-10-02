"""Every route of the administration API refuses a caller who administers nothing."""

import re
from types import SimpleNamespace

import pytest
from fastapi import status
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.member import ClubRole
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import get_auth_context

pytestmark = [pytest.mark.api, pytest.mark.auth]

OWN_USER_ID = "0000000000000000000000aa"
OTHER_USER_ID = "0000000000000000000000bb"
ANY_ID = "0000000000000000000000cc"

PUBLIC_PREFIX = "/api/v1/auth/"
OPEN_TO_ANY_CALLER = {
    ("GET", "/"),
    ("GET", "/api/v1/health"),
    ("GET", "/api/v1/users/me"),
    ("PATCH", "/api/v1/users/me/email"),
    ("POST", "/api/v1/payments/webhook"),
}
REPRESENTATIVE_ADMIN_ROUTES = [
    "/api/v1/clubs",
    "/api/v1/members",
    "/api/v1/licenses",
    "/api/v1/seminars",
    "/api/v1/payments",
    "/api/v1/insurances",
    "/api/dashboard/stats",
    "/api/v1/price-configurations",
    "/api/v1/invoices/member/" + ANY_ID,
    "/api/v1/member-payments/member/" + ANY_ID,
    "/api/v1/import-export/members/export",
]


def user(global_role=GlobalRole.USER) -> User:
    return User(
        id=OWN_USER_ID,
        email="user@example.com",
        username="user",
        hashed_password="hash",
        global_role=global_role,
    )


def plain_member() -> AuthContext:
    return AuthContext(user=user(), member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id="club-own"))


def user_without_member() -> AuthContext:
    return AuthContext(user=user())


def club_admin() -> AuthContext:
    return AuthContext(user=user(), member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id="club-own"))


@pytest.fixture(scope="module")
def app():
    return create_app()


def client_as(app, ctx: AuthContext) -> TestClient:
    app.dependency_overrides[get_auth_context] = lambda: ctx
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def clear_overrides(app):
    yield
    app.dependency_overrides.clear()


def admin_only_routes(app) -> list[tuple[str, str]]:
    routes = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
            if route.path.startswith(PUBLIC_PREFIX) or (method, route.path) in OPEN_TO_ANY_CALLER:
                continue
            routes.append((method, route.path))
    return routes


def statuses(client: TestClient, routes: list[tuple[str, str]]) -> dict[str, int]:
    return {
        f"{method} {path}": client.request(
            method, re.sub(r"\{[^}]+\}", OTHER_USER_ID, path), json={"email": "new@example.com"}
        ).status_code
        for method, path in routes
    }


@pytest.mark.parametrize("ctx_factory", [plain_member, user_without_member])
def test_every_admin_route_refuses_a_caller_who_administers_nothing(app, ctx_factory):
    routes = admin_only_routes(app)

    answered = statuses(client_as(app, ctx_factory()), routes)

    assert len(routes) > 60
    assert {route: code for route, code in answered.items() if code != status.HTTP_403_FORBIDDEN} == {}


def test_the_open_list_only_names_routes_that_exist(app):
    existing = {
        (method, route.path)
        for route in app.routes if isinstance(route, APIRoute)
        for method in route.methods
    }

    assert OPEN_TO_ANY_CALLER - existing == set()


@pytest.mark.parametrize("path", REPRESENTATIVE_ADMIN_ROUTES)
def test_the_guard_lets_a_club_admin_through(app, path):
    response = client_as(app, club_admin()).get(path)

    assert response.status_code != status.HTTP_401_UNAUTHORIZED
    assert "requires club admin privileges" not in response.text


def test_the_redsys_webhook_is_reachable_without_a_token(app):
    response = TestClient(app, raise_server_exceptions=False).post("/api/v1/payments/webhook", data={})

    assert response.status_code not in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_a_plain_member_is_refused_another_account(app):
    response = client_as(app, plain_member()).get(f"/api/v1/users/{OTHER_USER_ID}")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_a_plain_member_is_not_refused_their_own_account(app):
    response = client_as(app, plain_member()).get(f"/api/v1/users/{OWN_USER_ID}")

    assert response.status_code != status.HTTP_403_FORBIDDEN
