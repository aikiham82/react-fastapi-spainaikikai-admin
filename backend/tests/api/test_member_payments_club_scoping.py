"""A club admin reads member payments of their own club only."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_club_payment_summary_use_case,
    get_member_payment_history_use_case,
    get_member_payment_status_use_case,
    get_member_repository,
    get_unpaid_members_use_case,
)
from src.infrastructure.web.routers.member_payments import router
from tests.api.callers import (
    FOREIGN_MEMBER,
    OTHER_CLUB,
    OWN_CLUB,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    super_admin,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]


@pytest.fixture
def use_cases():
    status_result = SimpleNamespace(
        member_id=OWN_MEMBER, member_name="Ana Example", payment_year=2026, payment_statuses=[],
        total_paid=0.0, has_all_licenses=False, has_all_insurances=False,
    )
    history_result = SimpleNamespace(member_id=OWN_MEMBER, member_name="Ana Example", payments=[], total_count=0)
    summary_result = SimpleNamespace(
        club_id=OWN_CLUB, club_name="Club Example", payment_year=2026, total_members=0,
        members_with_license=0, members_with_insurance=0, total_collected=0.0, has_club_fee=False,
        by_payment_type=[], members=[],
    )
    unpaid_result = SimpleNamespace(
        club_id=OWN_CLUB, payment_year=2026, payment_type=None, unpaid_members=[], total_count=0
    )
    return SimpleNamespace(
        member_status=AsyncMock(**{"execute.return_value": status_result}),
        history=AsyncMock(**{"execute.return_value": history_result}),
        summary=AsyncMock(**{"execute.return_value": summary_result}),
        unpaid=AsyncMock(**{"execute.return_value": unpaid_result}),
    )


@pytest.fixture
def client_as(use_cases):
    def build(ctx) -> TestClient:
        app = FastAPI()
        app.include_router(router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_member_payment_status_use_case: lambda: use_cases.member_status,
            get_member_payment_history_use_case: lambda: use_cases.history,
            get_club_payment_summary_use_case: lambda: use_cases.summary,
            get_unpaid_members_use_case: lambda: use_cases.unpaid,
        }
        return TestClient(app)

    return build


def paths(member_id, club_id) -> list[str]:
    return [
        f"/api/v1/member-payments/member/{member_id}",
        f"/api/v1/member-payments/member/{member_id}/history",
        f"/api/v1/member-payments/club/{club_id}/summary",
        f"/api/v1/member-payments/club/{club_id}/unpaid",
    ]


def test_a_club_admin_is_refused_another_clubs_member_payments(client_as, use_cases):
    client = client_as(club_admin())

    answered = {path: client.get(path).status_code for path in paths(FOREIGN_MEMBER, OTHER_CLUB)}

    assert answered == {path: status.HTTP_403_FORBIDDEN for path in answered}
    for use_case in vars(use_cases).values():
        use_case.execute.assert_not_called()


def test_a_club_admin_reads_their_own_clubs_member_payments(client_as):
    client = client_as(club_admin())

    answered = {path: client.get(path).status_code for path in paths(OWN_MEMBER, OWN_CLUB)}

    assert answered == {path: status.HTTP_200_OK for path in answered}


def test_a_super_admin_reads_any_clubs_member_payments(client_as):
    client = client_as(super_admin())

    answered = {path: client.get(path).status_code for path in paths(FOREIGN_MEMBER, OTHER_CLUB)}

    assert answered == {path: status.HTTP_200_OK for path in answered}
