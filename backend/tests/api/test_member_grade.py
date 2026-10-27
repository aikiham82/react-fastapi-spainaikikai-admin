"""A club admin changes the grade number of a member of their club; nobody else can."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.application.use_cases.license.change_member_grade_use_case import ChangeMemberGradeUseCase
from src.app import create_app
from src.domain.entities.license import License, TechnicalGrade
from src.domain.entities.member import Member, MemberStatus
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_change_member_grade_use_case,
    get_insurance_repository,
    get_license_repository,
    get_member_use_case,
)
from tests.api.callers import OTHER_CLUB, OWN_CLUB, club_admin, plain_member, super_admin

pytestmark = [pytest.mark.api, pytest.mark.auth]


@pytest.fixture
def licences():
    return [License(id="lic-ana", license_number="LIC-1", member_id="member-ana", grade="5º Kyu",
                    technical_grade=TechnicalGrade.KYU, expiration_date=datetime(2026, 12, 31))]


@pytest.fixture
def client_as(licences):
    def build(ctx, member_club=OWN_CLUB, member_id="member-ana", member_status=MemberStatus.ACTIVE) -> TestClient:
        licence_repository = AsyncMock()
        licence_repository.find_by_member_id.side_effect = lambda _id: licences
        licence_repository.find_by_member_ids.side_effect = lambda _ids, limit=0: licences
        licence_repository.update.side_effect = lambda lic: lic
        insurance_repository = AsyncMock()
        insurance_repository.find_by_member_ids.return_value = []
        get_one = SimpleNamespace(execute=AsyncMock(return_value=Member(
            id=member_id, first_name="Ana", last_name="Ejemplo", club_id=member_club, status=member_status
        )))
        app = create_app()
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_use_case: lambda: get_one,
            get_license_repository: lambda: licence_repository,
            get_insurance_repository: lambda: insurance_repository,
            get_change_member_grade_use_case: lambda: ChangeMemberGradeUseCase(licence_repository),
        }
        return TestClient(app)

    return build


def change_grade(client: TestClient, grade_number):
    return client.put("/api/v1/members/member-ana/grade", json={"grade_number": grade_number})


def test_a_club_admin_changes_the_grade_of_a_member_of_their_club(client_as):
    response = change_grade(client_as(club_admin()), 4)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["license_summary"]["grade"] == "4º Kyu"


def test_a_super_admin_changes_the_grade_of_any_member(client_as):
    response = change_grade(client_as(super_admin(), member_club=OTHER_CLUB), 3)

    assert response.status_code == status.HTTP_200_OK


def test_a_club_admin_cannot_change_a_member_of_another_club(client_as, licences):
    response = change_grade(client_as(club_admin(), member_club=OTHER_CLUB), 4)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert licences[0].grade == "5º Kyu"


def test_a_plain_member_cannot_change_a_grade(client_as, licences):
    response = change_grade(client_as(plain_member()), 1)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert licences[0].grade == "5º Kyu"


def test_a_number_out_of_range_is_refused(client_as):
    response = change_grade(client_as(club_admin()), 7)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_a_member_without_licence_answers_not_found(client_as, licences):
    licences.clear()

    response = change_grade(client_as(club_admin()), 4)

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Este socio aún no tiene licencia en vigor"


def test_a_club_admin_cannot_change_their_own_grade(client_as, licences):
    response = client_as(club_admin(), member_id="member-admin").put(
        "/api/v1/members/member-admin/grade", json={"grade_number": 6}
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert licences[0].grade == "5º Kyu"


def test_a_club_admin_cannot_rewrite_the_grade_of_a_deregistered_member(client_as, licences):
    response = change_grade(client_as(club_admin(), member_status=MemberStatus.INACTIVE), 4)

    assert response.status_code == status.HTTP_409_CONFLICT
    assert licences[0].grade == "5º Kyu"


@pytest.mark.parametrize("grade_number", [True, "2", 2.5])
def test_only_a_whole_number_is_a_grade(client_as, grade_number):
    response = change_grade(client_as(club_admin()), grade_number)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
