"""A super admin creates licences from the form and from the Excel import."""

from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.application.use_cases.license.create_license_use_case import CreateLicenseUseCase
from src.domain.entities.license import AgeCategory, InstructorCategory, TechnicalGrade
from src.domain.entities.member import Member
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_create_license_use_case,
    get_license_repository,
    get_member_repository,
)
from src.infrastructure.web.routers.import_export import router as import_export_router
from src.infrastructure.web.routers.licenses import router as licenses_router
from tests.api.callers import OWN_CLUB, club_admin, super_admin

pytestmark = [pytest.mark.api]

MEMBER = Member(id="member-ana", first_name="Ana", last_name="Example Test", dni="00000000T", club_id=OWN_CLUB)


@pytest.fixture
def license_repository():
    repository = AsyncMock()
    repository.find_by_license_number.return_value = None
    repository.create.side_effect = lambda license: replace(license, id="license-new")
    return repository


@pytest.fixture
def client_as(license_repository):
    def build(ctx) -> TestClient:
        app = FastAPI()
        app.include_router(licenses_router, prefix="/api/v1")
        app.include_router(import_export_router, prefix="/api/v1")
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_create_license_use_case: lambda: CreateLicenseUseCase(license_repository),
            get_license_repository: lambda: license_repository,
            get_member_repository: lambda: SimpleNamespace(find_by_dni=AsyncMock(return_value=MEMBER)),
        }
        return TestClient(app)

    return build


def created_license(license_repository):
    return license_repository.create.call_args.args[0]


def categories_of(license):
    return (license.technical_grade, license.instructor_category, license.age_category)


def test_a_super_admin_creates_a_licence_with_its_categories(client_as, license_repository):
    response = client_as(super_admin()).post("/api/v1/licenses", json={
        "member_id": MEMBER.id, "license_type": "dan", "dan_grade": 2,
        "technical_grade": "dan", "instructor_category": "fukushidoin", "age_category": "adulto",
    })

    assert response.status_code == status.HTTP_201_CREATED
    assert categories_of(created_license(license_repository)) == (
        TechnicalGrade.DAN, InstructorCategory.FUKUSHIDOIN, AgeCategory.ADULTO
    )


def test_an_unknown_category_is_rejected_with_422(client_as, license_repository):
    response = client_as(super_admin()).post("/api/v1/licenses", json={
        "member_id": MEMBER.id, "technical_grade": "DAN", "age_category": "adult",
    })

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    license_repository.create.assert_not_called()


def test_an_unknown_licence_type_is_rejected_with_422(client_as, license_repository):
    response = client_as(super_admin()).post("/api/v1/licenses", json={"member_id": MEMBER.id, "license_type": "foo"})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    license_repository.create.assert_not_called()


def test_a_club_admin_cannot_create_a_licence(client_as, license_repository):
    response = client_as(club_admin()).post("/api/v1/licenses", json={"member_id": MEMBER.id})

    assert response.status_code == status.HTTP_403_FORBIDDEN
    license_repository.create.assert_not_called()


def test_a_licence_import_row_stores_its_categories(client_as, license_repository):
    response = client_as(super_admin()).post("/api/v1/import-export/licenses/import", json={"mode": "create", "licenses": [{
        "Nº Licencia": "LIC-9", "DNI": MEMBER.dni, "Grado": "5 kyu",
        "Grado Técnico": "kyu", "Cat. Instructor": "none", "Cat. Edad": "infantil",
    }]})

    assert response.json()["imported"] == 1, response.json()
    assert categories_of(created_license(license_repository)) == (
        TechnicalGrade.KYU, InstructorCategory.NONE, AgeCategory.INFANTIL
    )
