"""Editing a member saves the DNI, which stays unique among members."""

from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.application.use_cases.member.update_member_use_case import UpdateMemberUseCase
from src.domain.entities.member import Member
from src.infrastructure.web.dependencies import get_auth_context, get_member_use_case, get_update_member_use_case
from tests.api.callers import OWN_CLUB, super_admin

pytestmark = [pytest.mark.api]

ANA = Member(id="member-ana", first_name="Ana", last_name="Example", dni="00000000T", club_id=OWN_CLUB)
LUIS = Member(id="member-luis", first_name="Luis", last_name="Example", dni="11111111H", club_id=OWN_CLUB)
MEMBERS = {ANA.dni: ANA, LUIS.dni: LUIS}


@pytest.fixture
def repository():
    repository = AsyncMock()
    repository.find_by_id.side_effect = lambda _id: replace(ANA)
    repository.find_by_dni.side_effect = lambda dni: MEMBERS.get(dni)
    repository.update.side_effect = lambda member: member
    return repository


@pytest.fixture
def client(repository) -> TestClient:
    app = create_app()
    app.dependency_overrides = {
        get_auth_context: lambda: super_admin(),
        get_member_use_case: lambda: SimpleNamespace(execute=AsyncMock(return_value=ANA)),
        get_update_member_use_case: lambda: UpdateMemberUseCase(repository),
    }
    return TestClient(app)


def test_editing_a_member_saves_the_dni(client, repository):
    response = client.put(f"/api/v1/members/{ANA.id}", json={"dni": " 22222222J "})

    assert response.status_code == status.HTTP_200_OK
    assert repository.update.call_args.args[0].dni == "22222222J"


def test_keeping_the_own_dni_is_accepted(client, repository):
    response = client.put(f"/api/v1/members/{ANA.id}", json={"dni": ANA.dni})

    assert response.status_code == status.HTTP_200_OK


def test_a_dni_longer_than_twenty_characters_is_rejected(client, repository):
    response = client.put(f"/api/v1/members/{ANA.id}", json={"dni": "X" * 21})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_a_dni_of_another_member_is_refused(client, repository):
    response = client.put(f"/api/v1/members/{ANA.id}", json={"dni": LUIS.dni})

    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json()["detail"] == "Ya existe un miembro con ese DNI"
    repository.update.assert_not_called()
