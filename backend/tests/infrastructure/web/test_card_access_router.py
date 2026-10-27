"""The card activation request answers the same whatever happened."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.infrastructure.web.dependencies import get_request_card_access_use_case
from src.infrastructure.web.routers.users import router

pytestmark = [pytest.mark.unit, pytest.mark.api, pytest.mark.auth]

MESSAGE = "Si tu correo está en la ficha de un socio, te llegará un enlace para activar tu carné."


def client_with(use_case) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_request_card_access_use_case] = lambda: use_case
    return TestClient(app)


@pytest.mark.parametrize("outcome", [None, RuntimeError("anything")])
def test_the_answer_never_tells_what_happened(outcome):
    use_case = MagicMock()
    use_case.execute = AsyncMock(side_effect=outcome)

    response = client_with(use_case).post("/api/v1/auth/card-access/request", json={"email": "ana@example.com"})

    assert response.status_code == 200
    assert response.json() == {"message": MESSAGE}
    use_case.execute.assert_awaited_once_with("ana@example.com")


def test_needs_no_token():
    use_case = MagicMock()
    use_case.execute = AsyncMock(return_value=None)

    assert client_with(use_case).post("/api/v1/auth/card-access/request", json={"email": "x@example.com"}).status_code == 200
