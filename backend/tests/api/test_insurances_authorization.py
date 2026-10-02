"""API tests for who may read and change insurances."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.domain.entities.insurance import Insurance
from src.domain.entities.member import ClubRole
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext
from src.infrastructure.web.dependencies import (
    get_all_insurances_use_case,
    get_auth_context,
    get_create_insurance_use_case,
    get_delete_insurance_use_case,
    get_expiring_insurances_use_case,
    get_insurance_use_case,
    get_update_insurance_use_case,
)
from src.infrastructure.web.routers import insurances as insurances_router

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"
OWN_MEMBER = "member-own"
FOREIGN_MEMBER = "member-foreign"
CLUB_BY_MEMBER = {OWN_MEMBER: OWN_CLUB, FOREIGN_MEMBER: OTHER_CLUB}


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


def insurance_of(member_id: str) -> Insurance:
    return Insurance(
        id="insurance-id",
        member_id=member_id,
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=datetime(2025, 10, 1),
        end_date=datetime(2026, 9, 30, 23, 59, 59),
    )


NEW_INSURANCE = {
    "insurance_type": "accident",
    "policy_number": "PENDIENTE",
    "insurance_company": "Spain Aikikai",
    "start_date": "2026-10-01T00:00:00",
    "end_date": "2027-09-30T23:59:59",
}


@pytest.fixture
def use_cases():
    return SimpleNamespace(
        get_all=AsyncMock(),
        get_one=AsyncMock(),
        expiring=AsyncMock(),
        create=AsyncMock(),
        update=AsyncMock(),
        delete=AsyncMock(),
    )


@pytest.fixture
def client_as(use_cases, monkeypatch):
    async def club_of(member_id):
        return CLUB_BY_MEMBER.get(member_id)

    async def unchanged(items):
        return items

    monkeypatch.setattr(insurances_router, "_get_member_club_id", club_of)
    monkeypatch.setattr(insurances_router, "_populate_member_names", unchanged)

    def build(ctx: AuthContext, stored_member_id: str = OWN_MEMBER) -> TestClient:
        stored = insurance_of(stored_member_id)
        use_cases.get_all.execute.return_value = [stored]
        use_cases.get_one.execute.return_value = stored
        use_cases.expiring.execute.return_value = [insurance_of(OWN_MEMBER), insurance_of(FOREIGN_MEMBER)]
        use_cases.create.execute.return_value = stored
        use_cases.update.execute.return_value = stored

        app = FastAPI()
        app.include_router(insurances_router.router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_all_insurances_use_case: lambda: use_cases.get_all,
            get_insurance_use_case: lambda: use_cases.get_one,
            get_expiring_insurances_use_case: lambda: use_cases.expiring,
            get_create_insurance_use_case: lambda: use_cases.create,
            get_update_insurance_use_case: lambda: use_cases.update,
            get_delete_insurance_use_case: lambda: use_cases.delete,
        }
        return TestClient(app)

    return build


def every_request(client: TestClient, member_id: str):
    return {
        "list": client.get("/api/v1/insurances"),
        "list by member": client.get(f"/api/v1/insurances?member_id={member_id}"),
        "by member": client.get(f"/api/v1/insurances/member/{member_id}"),
        "detail": client.get("/api/v1/insurances/insurance-id"),
        "create": client.post("/api/v1/insurances", json={**NEW_INSURANCE, "member_id": member_id}),
        "update": client.put("/api/v1/insurances/insurance-id", json={"coverage_amount": 10}),
        "delete": client.delete("/api/v1/insurances/insurance-id"),
    }


@pytest.mark.api
@pytest.mark.auth
class TestInsurancesAuthorization:
    @pytest.mark.parametrize("ctx_factory", [plain_member, user_without_member])
    def test_a_user_who_administers_no_club_is_refused_everywhere(self, client_as, use_cases, ctx_factory):
        responses = every_request(client_as(ctx_factory()), OWN_MEMBER)

        assert {name: r.status_code for name, r in responses.items()} == {
            name: status.HTTP_403_FORBIDDEN for name in responses
        }
        use_cases.get_all.execute.assert_not_called()
        use_cases.create.execute.assert_not_called()
        use_cases.update.execute.assert_not_called()
        use_cases.delete.execute.assert_not_called()

    def test_a_club_admin_cannot_list_a_member_of_another_club(self, client_as, use_cases):
        response = client_as(club_admin()).get(f"/api/v1/insurances?member_id={FOREIGN_MEMBER}")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        use_cases.get_all.execute.assert_not_called()

    def test_a_club_admin_is_refused_on_insurances_of_another_club(self, client_as, use_cases):
        responses = every_request(client_as(club_admin(), stored_member_id=FOREIGN_MEMBER), FOREIGN_MEMBER)
        del responses["list"]

        assert {name: r.status_code for name, r in responses.items()} == {
            name: status.HTTP_403_FORBIDDEN for name in responses
        }
        use_cases.create.execute.assert_not_called()
        use_cases.update.execute.assert_not_called()
        use_cases.delete.execute.assert_not_called()

    def test_a_club_admin_lists_only_their_own_club(self, client_as, use_cases):
        response = client_as(club_admin()).get(f"/api/v1/insurances?club_id={OTHER_CLUB}")

        assert response.status_code == status.HTTP_200_OK
        use_cases.get_all.execute.assert_called_once_with(0, OWN_CLUB, None)

    def test_a_club_admin_works_with_insurances_of_their_own_club(self, client_as):
        responses = every_request(client_as(club_admin()), OWN_MEMBER)

        assert {name: r.status_code for name, r in responses.items()} == {
            "list": status.HTTP_200_OK,
            "list by member": status.HTTP_200_OK,
            "by member": status.HTTP_200_OK,
            "detail": status.HTTP_200_OK,
            "create": status.HTTP_201_CREATED,
            "update": status.HTTP_200_OK,
            "delete": status.HTTP_204_NO_CONTENT,
        }

    def test_a_super_admin_works_with_insurances_of_any_club(self, client_as):
        responses = every_request(client_as(super_admin(), stored_member_id=FOREIGN_MEMBER), FOREIGN_MEMBER)

        assert all(r.status_code < 300 for r in responses.values())

    def test_expiring_soon_is_reachable_and_scoped_to_the_club(self, client_as):
        response = client_as(club_admin()).get("/api/v1/insurances/expiring")

        assert response.status_code == status.HTTP_200_OK
        assert [item["member_id"] for item in response.json()] == [OWN_MEMBER]

    def test_expiring_soon_is_refused_to_a_plain_member(self, client_as, use_cases):
        response = client_as(plain_member()).get("/api/v1/insurances/expiring")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        use_cases.expiring.execute.assert_not_called()
