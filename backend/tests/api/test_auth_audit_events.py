"""Sign-in, recovery and access changes leave an audit event in Sentry."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.application.use_cases.password_reset import AdminPasswordResetLinkResult
from src.domain.entities.member import ClubRole, Member
from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.password_reset import PasswordResetTokenExpiredError, PasswordResetTokenNotFoundError
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_authenticate_user_use_case,
    get_grant_member_access_use_case,
    get_member_repository,
    get_member_use_case,
    get_request_password_reset_use_case,
    get_reset_password_use_case,
    get_revoke_member_access_use_case,
    get_set_member_club_role_use_case,
    get_validate_reset_token_use_case,
)
from src.infrastructure.web.routers import members, password_reset, users
from src.infrastructure.web.security import get_password_hash

pytestmark = [pytest.mark.api]

SCRUBBED_WORDS = ("password", "passwd", "secret", "auth", "token", "credential", "session", "bearer")


def assert_scrub_safe(event, level="info", **attributes):
    """Sentry turns any attribute value containing these words into [Filtered]."""
    for value in attributes.values():
        assert not any(word in str(value).lower() for word in SCRUBBED_WORDS), value

PASSWORD = "Correcta123!"
HASH = get_password_hash(PASSWORD)
MEMBER = Member(id="member-1", first_name="Ana", last_name="Ejemplo", club_id="club-1", club_role=ClubRole.ADMIN)


def account(**overrides) -> User:
    fields = dict(id="user-1", email="ana@example.com", username="ana", hashed_password=HASH, member_id="member-1")
    return User(**{**fields, **overrides})


def app_with(overrides) -> TestClient:
    app = FastAPI()
    for router in (users.router, password_reset.router, members.router):
        app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = overrides
    return TestClient(app)


def login_client(candidates, member=MEMBER) -> TestClient:
    return app_with({
        get_authenticate_user_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=candidates)),
        get_member_repository: lambda: SimpleNamespace(find_by_id=AsyncMock(return_value=member)),
    })


def log_in(client, password=PASSWORD):
    return client.post("/api/v1/auth/login", data={"username": "ana@example.com", "password": password})


class TestLoginAudit:

    def test_a_successful_sign_in_records_the_account_and_its_club(self):
        with patch.object(users, "audit", side_effect=assert_scrub_safe) as audit:
            assert log_in(login_client([account()])).status_code == 200

        audit.assert_called_once_with("auth.login.succeeded", user_id="user-1", club_id="club-1", club_role="admin")

    def test_a_sign_in_with_no_club_is_a_warning(self):
        with patch.object(users, "audit", side_effect=assert_scrub_safe) as audit:
            assert log_in(login_client([account(member_id="deleted")], member=None)).status_code == 200

        audit.assert_called_once_with("auth.login.succeeded_without_club", level="warning", user_id="user-1")

    def test_a_super_admin_is_recorded_as_such_even_when_linked_to_a_member(self):
        with patch.object(users, "audit", side_effect=assert_scrub_safe) as audit:
            assert log_in(login_client([account(global_role=GlobalRole.SUPER_ADMIN)])).status_code == 200

        audit.assert_called_once_with("auth.login.succeeded", user_id="user-1", club_id=None, club_role="super_admin")

    @pytest.mark.parametrize("candidates, password, reason", [
        ([], PASSWORD, "unknown_account"),
        ([account(is_active=False)], PASSWORD, "inactive"),
        ([account(hashed_password=None)], PASSWORD, "not_set_up"),
        ([account()], "mala", "incorrect"),
    ])
    def test_a_failed_sign_in_records_why_without_the_identifier(self, candidates, password, reason):
        with patch.object(users, "audit", side_effect=assert_scrub_safe) as audit:
            assert log_in(login_client(candidates), password).status_code == 401

        audit.assert_called_once_with("auth.login.failed", level="warning", reason=reason)


class TestPasswordResetAudit:

    def test_a_request_is_recorded(self):
        use_case = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(success=True, message="ok")))
        client = app_with({get_request_password_reset_use_case: lambda: use_case})

        with patch.object(password_reset, "audit", side_effect=assert_scrub_safe) as audit:
            client.post("/api/v1/auth/password-reset/request", json={"identifier": "ana@example.com"})

        audit.assert_called_once_with("auth.password_reset.requested")

    @pytest.mark.parametrize("error, reason", [
        (PasswordResetTokenNotFoundError(), "not_found"),
        (PasswordResetTokenExpiredError(), "expired"),
    ])
    def test_a_rejected_link_is_recorded_with_why_and_where(self, error, reason):
        use_case = SimpleNamespace(execute=AsyncMock(side_effect=error))
        client = app_with({get_validate_reset_token_use_case: lambda: use_case, get_reset_password_use_case: lambda: use_case})

        with patch.object(password_reset, "audit", side_effect=assert_scrub_safe) as audit:
            client.get("/api/v1/auth/password-reset/validate/abc")
            client.post("/api/v1/auth/password-reset/reset", json={"token": "abc", "new_password": "Nueva1234!"})

        assert [c.args[0] for c in audit.call_args_list] == ["auth.password_reset.token_rejected"] * 2
        assert {c.kwargs["step"] for c in audit.call_args_list} == {"validate", "reset"}
        assert {c.kwargs["reason"] for c in audit.call_args_list} == {reason}

    def test_a_completed_reset_is_recorded(self):
        use_case = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(success=True, message="ok")))
        client = app_with({get_reset_password_use_case: lambda: use_case})

        with patch.object(password_reset, "audit", side_effect=assert_scrub_safe) as audit:
            client.post("/api/v1/auth/password-reset/reset", json={"token": "abc", "new_password": "Nueva1234!"})

        audit.assert_called_once_with("auth.password_reset.completed")


class TestAccessAudit:

    @pytest.fixture
    def client(self):
        super_admin = AuthContext(user=account(id="admin", global_role=GlobalRole.SUPER_ADMIN, member_id=None))
        link = AdminPasswordResetLinkResult(url="https://admin.example.com/r?token=t", email="x@example.com", expires_at=datetime(2026, 10, 26))
        return app_with({
            get_auth_context: lambda: super_admin,
            get_member_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=MEMBER)),
            get_grant_member_access_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=link)),
            get_revoke_member_access_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=None)),
            get_set_member_club_role_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=MEMBER)),
        })

    def test_every_access_change_is_recorded(self, client):
        with patch.object(members, "audit", side_effect=assert_scrub_safe) as audit:
            client.post("/api/v1/members/member-1/account", json={"email": "x@example.com", "club_admin": True})
            client.patch("/api/v1/members/member-1/club-role", json={"club_role": "member"})
            client.delete("/api/v1/members/member-1/account")

        assert [(c.args[0], c.kwargs) for c in audit.call_args_list] == [
            ("access.granted", {"member_id": "member-1", "club_id": "club-1", "club_admin": True, "by": "admin"}),
            ("access.role_changed", {"member_id": "member-1", "club_id": "club-1", "club_role": "member", "by": "admin"}),
            ("access.revoked", {"member_id": "member-1", "club_id": "club-1", "by": "admin"}),
        ]
