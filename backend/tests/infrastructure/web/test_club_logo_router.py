"""Who may upload a club logo and what is stored."""

from io import BytesIO

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.club import Club
from src.infrastructure.web.dependencies import (
    get_auth_context,
    get_set_club_logo_use_case,
    require_admin_access,
)
from src.infrastructure.web.routers import clubs
from tests.api.callers import OTHER_CLUB, OWN_CLUB, club_admin, plain_member, super_admin

pytestmark = [pytest.mark.unit, pytest.mark.api]

LOGO = f"/api/v1/clubs/{OWN_CLUB}/logo"


def png(width=400, height=200) -> bytes:
    output = BytesIO()
    Image.new("RGB", (width, height), "red").save(output, format="PNG")
    return output.getvalue()


@pytest.fixture
def logo_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(clubs, "CLUB_LOGO_DIR", tmp_path)
    return tmp_path


def client_as(ctx):
    use_case = MagicMock()
    use_case.execute = AsyncMock(
        side_effect=lambda club_id, logo_url: Club(id=club_id, name="Club Aikido Ejemplo", logo_url=logo_url)
    )
    app = FastAPI()
    app.include_router(clubs.router, prefix="/api/v1", dependencies=[Depends(require_admin_access)])
    app.dependency_overrides[get_auth_context] = lambda: ctx
    app.dependency_overrides[get_set_club_logo_use_case] = lambda: use_case
    return TestClient(app), use_case


def upload(client, content: bytes, url=LOGO):
    return client.post(url, files={"file": ("logo.png", content, "image/png")})


def test_a_club_admin_uploads_their_club_logo_as_a_square_jpeg(logo_dir):
    client, use_case = client_as(club_admin(club_id=OWN_CLUB))

    response = upload(client, png())

    assert response.status_code == 200
    assert response.json()["logo_url"].startswith(f"/uploads/clubs/{OWN_CLUB}.jpg?v=")
    stored = Image.open(logo_dir / f"{OWN_CLUB}.jpg")
    assert (stored.format, stored.size) == ("JPEG", (256, 256))
    use_case.execute.assert_awaited_once()


def test_the_super_admin_uploads_any_club_logo(logo_dir):
    client, _ = client_as(super_admin())

    assert upload(client, png()).status_code == 200


def test_a_file_that_is_not_an_image_is_refused(logo_dir):
    client, use_case = client_as(club_admin(club_id=OWN_CLUB))

    assert upload(client, b"%PDF-1.4 not an image").status_code == 422
    use_case.execute.assert_not_called()


def test_another_clubs_admin_may_not_change_the_logo(logo_dir):
    client, use_case = client_as(club_admin(club_id=OTHER_CLUB))

    assert upload(client, png()).status_code == 403
    use_case.execute.assert_not_called()


def test_a_plain_member_may_not_change_the_logo(logo_dir):
    client, use_case = client_as(plain_member())

    assert upload(client, png()).status_code == 403
    use_case.execute.assert_not_called()


def test_a_club_id_cannot_escape_the_logo_folder(logo_dir):
    client, use_case = client_as(super_admin())

    assert upload(client, png(), url="/api/v1/clubs/..%2F..%2Fsecret/logo").status_code in (404, 422)
    use_case.execute.assert_not_called()
