"""A super admin edits a licence: what is sent is stored, and validity follows the dates unless annulled."""

from dataclasses import replace
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.application.use_cases.license.update_license_use_case import UpdateLicenseUseCase
from src.domain.entities.license import (
    AgeCategory,
    InstructorCategory,
    License,
    LicenseStatus,
    TechnicalGrade,
)
from src.infrastructure.web.dependencies import get_auth_context, get_update_license_use_case
from src.app import create_app
from tests.api.callers import club_admin, super_admin

pytestmark = [pytest.mark.api]

PAST = datetime(2025, 12, 31, 23, 59, 59)
FUTURE = datetime.now() + timedelta(days=200)


def licence(**overrides) -> License:
    return replace(
        License(id="license-ana", license_number="LIC-1", member_id="member-ana", grade="3º Kyu",
                expiration_date=FUTURE),
        **overrides,
    )


@pytest.fixture
def stored():
    return {"licence": licence()}


@pytest.fixture
def client_as(stored):
    def build(ctx) -> TestClient:
        repository = AsyncMock()
        repository.find_by_id.side_effect = lambda _id: stored["licence"]
        repository.update.side_effect = lambda lic: stored.update(licence=lic) or lic
        app = create_app()
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_update_license_use_case: lambda: UpdateLicenseUseCase(repository),
        }
        return TestClient(app)

    return build


def edit(client_as, body: dict, ctx=None):
    return client_as(ctx or super_admin()).put("/api/v1/licenses/license-ana", json=body)


@pytest.mark.parametrize("grade, instructor, age", [
    ("kyu", "none", "adulto"),
    ("dan", "none", "adulto"),
    ("kyu", "none", "infantil"),
    ("dan", "shidoin", "adulto"),
    ("dan", "fukushidoin", "adulto"),
    ("kyu", "shidoin", "adulto"),
])
def test_a_licence_edit_stores_its_categories(client_as, stored, grade, instructor, age):
    response = edit(client_as, {"technical_grade": grade, "instructor_category": instructor, "age_category": age})

    assert response.status_code == status.HTTP_200_OK
    saved = stored["licence"]
    assert (saved.technical_grade, saved.instructor_category, saved.age_category) == (
        TechnicalGrade(grade), InstructorCategory(instructor), AgeCategory(age)
    )


def test_moving_an_expired_licence_forward_puts_it_in_force(client_as, stored):
    stored["licence"] = licence(expiration_date=PAST, status=LicenseStatus.EXPIRED)

    response = edit(client_as, {"expiration_date": FUTURE.isoformat(), "grade": "2º Dan"})

    assert response.json()["status"] == "active"
    assert (stored["licence"].status, stored["licence"].grade) == (LicenseStatus.ACTIVE, "2º Dan")


def test_moving_a_licence_back_expires_it(client_as, stored):
    response = edit(client_as, {"expiration_date": PAST.isoformat()})

    assert response.json()["status"] == "expired"


def test_an_annulled_licence_stays_annulled_with_future_dates(client_as, stored):
    response = edit(client_as, {"annulled": True})

    assert response.json()["status"] == "revoked"
    assert stored["licence"].status == LicenseStatus.REVOKED


def test_a_reactivated_licence_follows_its_dates(client_as, stored):
    stored["licence"] = licence(status=LicenseStatus.REVOKED)

    response = edit(client_as, {"annulled": False})

    assert response.json()["status"] == "active"


def test_a_club_admin_cannot_edit_a_licence(client_as, stored):
    response = edit(client_as, {"annulled": True}, ctx=club_admin())

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert stored["licence"].status == LicenseStatus.ACTIVE


async def test_the_licence_import_still_marks_a_licence_renewed(stored):
    repository = AsyncMock()
    repository.find_by_id.side_effect = lambda _id: stored["licence"]
    repository.update.side_effect = lambda lic: lic

    updated = await UpdateLicenseUseCase(repository).execute(
        license_id="license-ana", technical_grade=TechnicalGrade.DAN, is_renewed=True
    )

    assert (updated.is_renewed, updated.technical_grade) == (True, TechnicalGrade.DAN)


def test_a_timezone_aware_expiration_is_stored_naive(client_as, stored):
    response = edit(client_as, {"expiration_date": "2027-12-31T22:59:59+00:00"})

    assert response.status_code == status.HTTP_200_OK
    assert stored["licence"].expiration_date == datetime(2027, 12, 31, 22, 59, 59)


def test_an_empty_grade_is_rejected(client_as, stored):
    response = edit(client_as, {"grade": " "})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_an_issue_date_after_the_expiration_is_rejected(client_as, stored):
    response = edit(client_as, {"issue_date": "2027-06-01T00:00:00", "expiration_date": "2027-01-01T00:00:00"})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_editing_a_pending_licence_category_keeps_it_pending(client_as, stored):
    stored["licence"] = licence(status=LicenseStatus.PENDING)

    edit(client_as, {"age_category": "infantil"})

    assert stored["licence"].status == LicenseStatus.PENDING
