"""The member status board shows, per member, the licence of the year paid next to what is in force."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.club import Club
from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.entities.license import License
from src.domain.entities.member import Member, MemberStatus
from src.domain.entities.member_payment import MemberPayment, MemberPaymentStatus, MemberPaymentType
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_auth_context,
    get_club_repository,
    get_insurance_repository,
    get_license_repository,
    get_member_payment_repository,
)
from src.infrastructure.web.routers.members import router
from tests.api.callers import club_admin, super_admin

pytestmark = [pytest.mark.api]

YEAR = 2026
IN_FORCE = datetime(2099, 12, 31)

MEMBERS = [
    Member(id="kyu", first_name="Ana", last_name="Example One", club_id="club-a"),
    Member(id="infantil", first_name="Leo", last_name="Example", club_id="club-a"),
    Member(id="dan", first_name="Sara", last_name="Example", club_id="club-b"),
    Member(id="title", first_name="Mario", last_name="Example", club_id="club-b"),
    Member(id="unpaid", first_name="Luis", last_name="Example", club_id="club-a"),
    Member(id="unlicensed", first_name="Eva", last_name="Example", club_id="club-a"),
    Member(id="next-year", first_name="Pau", last_name="Example", club_id="club-a"),
    Member(id="deregistered", first_name="Noa", last_name="Example", club_id="club-a", status=MemberStatus.INACTIVE),
]


def licence(member_id: str, grade: str = "6º Kyu") -> License:
    loaded = License(id=f"lic-{member_id}", license_number=f"SA-{member_id}", member_id=member_id,
                     grade=grade, expiration_date=IN_FORCE)
    loaded.check_and_update_status()
    return loaded


def line(member_id: str, payment_type: MemberPaymentType, year: int = YEAR) -> MemberPayment:
    return MemberPayment(id=f"mp-{member_id}", payment_id="pay-1", member_id=member_id, payment_year=year,
                         payment_type=payment_type, amount=10.0, status=MemberPaymentStatus.COMPLETED)


LICENCES = [licence(m) for m in ("kyu", "infantil", "title", "unpaid", "next-year", "deregistered")] + [
    licence("dan", "1º Dan")
]
INSURANCES = [
    Insurance(id="ac-kyu", policy_number="P-1", insurance_company="Example Insurer", member_id="kyu", insurance_type=InsuranceType.ACCIDENT,
              start_date=datetime(2025, 10, 1), end_date=IN_FORCE),
    Insurance(id="rc-title", policy_number="P-2", insurance_company="Example Insurer", member_id="title", insurance_type=InsuranceType.CIVIL_LIABILITY,
              start_date=datetime(2025, 10, 1), end_date=IN_FORCE),
]
LINES = {
    YEAR: [
        line("kyu", MemberPaymentType.LICENCIA_KYU),
        line("infantil", MemberPaymentType.LICENCIA_KYU_INFANTIL),
        line("dan", MemberPaymentType.LICENCIA_DAN),
        line("title", MemberPaymentType.TITULO_SHIDOIN),
        line("deregistered", MemberPaymentType.LICENCIA_KYU),
    ],
    YEAR + 1: [line("next-year", MemberPaymentType.LICENCIA_KYU, YEAR + 1)],
}


async def lines_of_year(member_ids, payment_year, status=None):
    return [mp for mp in LINES.get(payment_year, []) if mp.member_id in member_ids]


def build_client(ctx) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        get_auth_context: lambda: ctx,
        get_all_members_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=list(MEMBERS))),
        get_license_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=LICENCES)),
        get_insurance_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=INSURANCES)),
        get_club_repository: lambda: SimpleNamespace(find_by_ids=AsyncMock(return_value=[
            Club(id="club-a", name="Dojo Example A"), Club(id="club-b", name="Dojo Example B"),
        ])),
        get_member_payment_repository: lambda: SimpleNamespace(find_by_member_ids_year=lines_of_year),
    }
    return TestClient(app)


@pytest.fixture
def board():
    response = build_client(super_admin()).get("/api/v1/members/status-board", params={"payment_year": YEAR})
    assert response.status_code == 200
    return {row["member_id"]: row for row in response.json()}


@pytest.mark.parametrize("member_id", ["kyu", "infantil", "dan", "title"])
def test_a_licence_or_title_paid_that_year_is_paid(board, member_id):
    assert board[member_id]["license_paid"] is True
    assert board[member_id]["license_payment_id"] == f"mp-{member_id}"


def test_a_licence_in_force_without_a_payment_is_not_paid(board):
    row = board["unpaid"]
    assert row["license_paid"] is False
    assert row["license_payment_id"] is None
    assert row["license_summary"]["status"] == "active"


def test_a_member_without_licence_has_no_licence_summary(board):
    assert board["unlicensed"]["license_summary"] is None
    assert board["unlicensed"]["license_paid"] is False


def test_a_payment_of_the_next_year_does_not_pay_this_year(board):
    assert board["next-year"]["license_paid"] is False


def test_a_deregistered_member_is_listed_with_their_status(board):
    assert board["deregistered"]["member_status"] == "inactive"
    assert board["deregistered"]["license_paid"] is True


def test_each_row_names_the_member_and_their_club(board):
    row = board["kyu"]
    assert (row["first_name"], row["last_name"], row["club_id"], row["club_name"]) == (
        "Ana", "Example One", "club-a", "Dojo Example A")


def test_insurances_show_accident_and_rc_apart(board):
    assert board["kyu"]["insurance_summary"]["accident_status"] == "active"
    assert board["kyu"]["insurance_summary"]["has_rc"] is False
    assert board["title"]["insurance_summary"]["rc_status"] == "active"


def test_every_member_is_listed(board):
    assert set(board) == {m.id for m in MEMBERS}


def test_a_club_admin_cannot_see_the_board():
    response = build_client(club_admin()).get("/api/v1/members/status-board", params={"payment_year": YEAR})
    assert response.status_code == 403
