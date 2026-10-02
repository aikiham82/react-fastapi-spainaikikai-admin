"""A club admin reads the licences of their own club only."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.app import create_app
from src.domain.entities.license import License
from src.infrastructure.web.dependencies import (
    get_all_licenses_use_case,
    get_auth_context,
    get_expiring_licenses_use_case,
    get_generate_license_image_use_case,
    get_license_use_case,
    get_member_repository,
)
from tests.api.callers import (
    FOREIGN_MEMBER,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    super_admin,
)

pytestmark = [pytest.mark.api, pytest.mark.auth]


def licence_of(member_id) -> License:
    return License(id=f"licence-of-{member_id}", license_number="SA-2026-001", member_id=member_id, grade="1º Kyu")


@pytest.fixture
def use_cases():
    return SimpleNamespace(get_all=AsyncMock(), get_one=AsyncMock(), expiring=AsyncMock(), image=AsyncMock())


@pytest.fixture
def client_as(use_cases):
    app = create_app()

    def build(ctx, licence_owner=OWN_MEMBER) -> TestClient:
        use_cases.get_all.execute.return_value = []
        use_cases.get_one.execute.return_value = licence_of(licence_owner)
        use_cases.expiring.execute.return_value = [licence_of(OWN_MEMBER), licence_of(FOREIGN_MEMBER)]
        use_cases.image.execute.return_value = SimpleNamespace(
            image_bytes=b"png", content_type="image/png", filename="licence.png"
        )
        app.dependency_overrides = {
            get_auth_context: lambda: ctx,
            get_member_repository: lambda: MembersByClub(),
            get_all_licenses_use_case: lambda: use_cases.get_all,
            get_license_use_case: lambda: use_cases.get_one,
            get_expiring_licenses_use_case: lambda: use_cases.expiring,
            get_generate_license_image_use_case: lambda: use_cases.image,
        }
        return TestClient(app)

    return build


def by_licence(client: TestClient, member_id: str) -> dict:
    return {
        "detail": client.get("/api/v1/licenses/licence-id").status_code,
        "image": client.get("/api/v1/licenses/licence-id/image").status_code,
        "by member": client.get(f"/api/v1/licenses/member/{member_id}").status_code,
    }


def test_a_club_admin_is_refused_the_licences_of_another_club(client_as, use_cases):
    answered = by_licence(client_as(club_admin(), licence_owner=FOREIGN_MEMBER), FOREIGN_MEMBER)

    assert answered == {name: status.HTTP_403_FORBIDDEN for name in answered}
    use_cases.image.execute.assert_not_called()
    use_cases.get_all.execute.assert_not_called()


def test_a_club_admin_cannot_list_the_licences_of_a_foreign_member(client_as, use_cases):
    client = client_as(club_admin())

    assert client.get(f"/api/v1/licenses?member_id={FOREIGN_MEMBER}").status_code == status.HTTP_403_FORBIDDEN
    use_cases.get_all.execute.assert_not_called()
    assert client.get(f"/api/v1/licenses?member_id={OWN_MEMBER}").status_code == status.HTTP_200_OK


def test_a_club_admin_reads_the_licences_of_their_club(client_as):
    answered = by_licence(client_as(club_admin()), OWN_MEMBER)

    assert answered == {name: status.HTTP_200_OK for name in answered}


def test_a_super_admin_reads_the_licences_of_any_club(client_as):
    answered = by_licence(client_as(super_admin(), licence_owner=FOREIGN_MEMBER), FOREIGN_MEMBER)

    assert answered == {name: status.HTTP_200_OK for name in answered}


def test_a_club_admin_sees_only_their_clubs_expiring_licences(client_as):
    response = client_as(club_admin()).get("/api/v1/licenses/expiring")

    assert response.status_code == status.HTTP_200_OK
    assert [licence["member_id"] for licence in response.json()] == [OWN_MEMBER]


def test_a_super_admin_sees_every_expiring_licence(client_as):
    response = client_as(super_admin()).get("/api/v1/licenses/expiring")

    assert len(response.json()) == 2
