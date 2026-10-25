"""An insurance edit stores what is sent, and validity follows the dates unless annulled."""

from dataclasses import replace
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.application.use_cases.insurance.update_insurance_use_case import UpdateInsuranceUseCase
from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_insurance_use_case,
    get_member_repository,
    get_update_insurance_use_case,
)
from src.app import create_app
from tests.api.callers import OWN_CLUB, OWN_MEMBER, club_admin, super_admin

pytestmark = [pytest.mark.api]

SEASON_2025_26 = (datetime(2025, 10, 1), datetime(2026, 9, 30, 23, 59, 59))
SEASON_2026_27 = (datetime(2026, 10, 1), datetime(2027, 9, 30, 23, 59, 59))


def insurance(**overrides) -> Insurance:
    return replace(
        Insurance(id="insurance-ana", member_id=OWN_MEMBER, insurance_type=InsuranceType.ACCIDENT,
                  policy_number="POL-1", insurance_company="Aseguradora Example",
                  start_date=SEASON_2026_27[0], end_date=datetime.utcnow() + timedelta(days=200)),
        **overrides,
    )


@pytest.fixture
def stored():
    return {"insurance": insurance()}


@pytest.fixture
def client_as(stored):
    def build(ctx) -> TestClient:
        repository = AsyncMock()
        repository.find_by_id.side_effect = lambda _id: stored["insurance"]
        repository.update.side_effect = lambda ins: stored.update(insurance=ins) or ins
        app = create_app()
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_update_insurance_use_case: lambda: UpdateInsuranceUseCase(repository),
            get_insurance_use_case: lambda: SimpleNamespace(execute=AsyncMock(side_effect=lambda _id: stored["insurance"])),
            get_member_repository: lambda: SimpleNamespace(
                find_by_id=AsyncMock(return_value=SimpleNamespace(id=OWN_MEMBER, club_id=OWN_CLUB))
            ),
        }
        return TestClient(app)

    return build


def edit(client_as, body: dict, ctx=None):
    return client_as(ctx or super_admin()).put("/api/v1/insurances/insurance-ana", json=body)


def test_an_insurance_edit_stores_type_company_and_policy(client_as, stored):
    response = edit(client_as, {
        "insurance_type": "civil_liability", "insurance_company": "Otra Example", "policy_number": "POL-2",
    })

    assert response.status_code == status.HTTP_200_OK
    saved = stored["insurance"]
    assert (saved.insurance_type, saved.insurance_company, saved.policy_number) == (
        InsuranceType.CIVIL_LIABILITY, "Otra Example", "POL-2"
    )


@pytest.mark.parametrize("insurance_type", ["accident", "civil_liability"])
def test_moving_an_expired_insurance_forward_puts_it_in_force(client_as, stored, insurance_type):
    stored["insurance"] = insurance(insurance_type=InsuranceType(insurance_type),
                                    start_date=SEASON_2025_26[0], end_date=SEASON_2025_26[1])

    response = edit(client_as, {"start_date": SEASON_2026_27[0].isoformat(), "end_date": SEASON_2026_27[1].isoformat()})

    assert response.json()["status"] == "active"


def test_an_annulled_insurance_stays_annulled_with_future_dates(client_as, stored):
    response = edit(client_as, {"annulled": True})

    assert response.json()["status"] == "cancelled"
    assert stored["insurance"].status == InsuranceStatus.CANCELLED


def test_a_reactivated_insurance_follows_its_dates(client_as, stored):
    stored["insurance"] = insurance(status=InsuranceStatus.CANCELLED,
                                    start_date=SEASON_2025_26[0], end_date=SEASON_2025_26[1])

    response = edit(client_as, {"annulled": False})

    assert response.json()["status"] == "expired"


def test_a_club_admin_cannot_annul_an_insurance(client_as, stored):
    response = edit(client_as, {"annulled": True}, ctx=club_admin())

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert stored["insurance"].status == InsuranceStatus.ACTIVE


def test_an_end_before_the_start_is_rejected(client_as, stored):
    response = edit(client_as, {"start_date": SEASON_2026_27[1].isoformat(), "end_date": SEASON_2026_27[0].isoformat()})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
