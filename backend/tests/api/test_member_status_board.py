"""The member status board shows, per member, the licence of the year paid next to what is in force."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.domain.entities.club import Club
from src.domain.entities.insurance import Insurance, InsuranceType
from src.domain.entities.license import InstructorCategory, License, TechnicalGrade
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
from tests.api.callers import club_admin, plain_member, super_admin

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


def licence(member_id: str, grade: str = "6º Kyu", title: InstructorCategory = InstructorCategory.NONE) -> License:
    technical = TechnicalGrade.DAN if "Dan" in grade else TechnicalGrade.KYU
    loaded = License(id=f"lic-{member_id}", license_number=f"SA-{member_id}", member_id=member_id, grade=grade,
                     technical_grade=technical, instructor_category=title, expiration_date=IN_FORCE)
    loaded.check_and_update_status()
    return loaded


def line(member_id: str, payment_type: MemberPaymentType, year: int = YEAR) -> MemberPayment:
    return MemberPayment(id=f"mp-{member_id}", payment_id="pay-1", member_id=member_id, payment_year=year,
                         payment_type=payment_type, amount=10.0, status=MemberPaymentStatus.COMPLETED)


LICENCES = [licence(m) for m in ("kyu", "unpaid", "next-year", "deregistered")] + [
    licence("infantil", "6º Kyu infantil"),
    licence("dan", "1º Dan"),
    licence("title", "2º Dan", InstructorCategory.SHIDOIN),
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
    app.dependency_overrides = dependency_overrides(ctx)
    return TestClient(app)


def dependency_overrides(ctx) -> dict:
    return {
        get_auth_context: lambda: ctx,
        get_all_members_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=list(MEMBERS))),
        get_license_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=LICENCES)),
        get_insurance_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=INSURANCES)),
        get_club_repository: lambda: SimpleNamespace(find_by_ids=AsyncMock(return_value=[
            Club(id="club-a", name="Dojo Example A"), Club(id="club-b", name="Dojo Example B"),
        ])),
        get_member_payment_repository: lambda: SimpleNamespace(find_by_member_ids_year=lines_of_year),
    }


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


@pytest.mark.parametrize("ctx", [club_admin, plain_member])
def test_only_a_super_admin_sees_the_board(ctx):
    response = build_client(ctx()).get("/api/v1/members/status-board", params={"payment_year": YEAR})
    assert response.status_code == 403


def test_with_a_licence_and_a_title_the_licence_line_is_the_one_unticked():
    def title(line_id: str, payment_type: MemberPaymentType) -> MemberPayment:
        return MemberPayment(id=line_id, payment_id="pay-2", member_id="dan", payment_year=YEAR,
                             payment_type=payment_type, amount=10.0, status=MemberPaymentStatus.COMPLETED)

    both = [
        title("mp-title", MemberPaymentType.TITULO_SHIDOIN),
        line("dan", MemberPaymentType.LICENCIA_DAN),
        title("mp-title-late", MemberPaymentType.TITULO_FUKUSHIDOIN),
    ]

    async def lines(member_ids, payment_year, status=None):
        return both

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        **dependency_overrides(super_admin()),
        get_member_payment_repository: lambda: SimpleNamespace(find_by_member_ids_year=lines),
    }
    rows = TestClient(app).get("/api/v1/members/status-board", params={"payment_year": YEAR}).json()
    assert next(r for r in rows if r["member_id"] == "dan")["license_payment_id"] == "mp-dan"


@pytest.mark.parametrize("member_id, item", [
    ("kyu", "kyu"), ("infantil", "kyu_infantil"), ("dan", "dan"), ("title", "shidoin"), ("unlicensed", None),
])
def test_each_row_names_the_licence_a_tick_would_pay(board, member_id, item):
    assert board[member_id]["licence_item"] == item


def accident(insurance_id: str, end_date: datetime, annulled: bool = False) -> Insurance:
    insurance = Insurance(id=insurance_id, policy_number="P-9", insurance_company="Example Insurer", member_id="kyu",
                          insurance_type=InsuranceType.ACCIDENT, start_date=datetime(2020, 10, 1), end_date=end_date)
    if annulled:
        insurance.cancel()
    return insurance


def kyu_row_with(insurances: list) -> dict:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides = {
        **dependency_overrides(super_admin()),
        get_insurance_repository: lambda: SimpleNamespace(find_by_member_ids=AsyncMock(return_value=insurances)),
    }
    rows = TestClient(app).get("/api/v1/members/status-board", params={"payment_year": YEAR}).json()
    return next(r for r in rows if r["member_id"] == "kyu")


def test_an_insurance_in_force_is_the_one_a_tick_acts_on():
    row = kyu_row_with([accident("ac-now", IN_FORCE)])
    assert (row["accident_insurance_id"], row["accident_insurance_annulled"]) == ("ac-now", False)
    assert (row["rc_insurance_id"], row["rc_insurance_annulled"]) == (None, False)


def test_an_insurance_expired_by_date_is_not_offered():
    assert kyu_row_with([accident("ac-old", datetime(2025, 9, 30))])["accident_insurance_id"] is None


def test_an_annulled_insurance_still_in_its_dates_can_be_reactivated():
    row = kyu_row_with([accident("ac-annulled", IN_FORCE, annulled=True)])
    assert (row["accident_insurance_id"], row["accident_insurance_annulled"]) == ("ac-annulled", True)


def test_among_several_in_their_dates_the_latest_end_date_wins():
    row = kyu_row_with([accident("ac-later", datetime(2099, 12, 31)), accident("ac-sooner", datetime(2098, 12, 31))])
    assert row["accident_insurance_id"] == "ac-later"


def test_without_insurance_there_is_nothing_to_act_on(board):
    assert board["unlicensed"]["accident_insurance_id"] is None
    assert board["title"]["rc_insurance_id"] == "rc-title"
