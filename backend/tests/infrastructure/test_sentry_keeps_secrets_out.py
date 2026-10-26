"""A crash while a password is reset sends Sentry neither the password, the token nor its hash."""

import json

import pytest
import sentry_sdk
from fastapi.testclient import TestClient
from sentry_sdk.transport import Transport

from src.app import create_app
from src.config import sentry as sentry_config
from src.infrastructure.web.dependencies import get_reset_password_use_case, get_validate_reset_token_use_case

SECRETS = ["PATHTOKEN123", "QUERYTOKEN123", "BODYTOKEN456", "PlainPass!9xyz"]


class Crash:
    async def execute(self, *args, **kwargs):
        hashed_password = "$".join(["", "2b", "12", "abcdefghijklmnopqrstuv"])
        raise RuntimeError(f"database down {len(hashed_password)}")


@pytest.fixture
def sentry_events(monkeypatch):
    events = []

    class CaptureTransport(Transport):
        def capture_envelope(self, envelope):
            events.extend(item.payload.json for item in envelope.items if item.headers.get("type") == "event")

    original_init = sentry_sdk.init
    monkeypatch.setenv("SENTRY_DSN", "https://key@o0.ingest.sentry.io/1")
    monkeypatch.setattr(sentry_config.sentry_sdk, "init", lambda **options: original_init(**options, transport=CaptureTransport))
    yield events
    sentry_sdk.get_client().close()
    monkeypatch.delenv("SENTRY_DSN")
    original_init()


@pytest.mark.unit
def test_a_crash_during_a_password_reset_keeps_the_secrets_out_of_sentry(sentry_events):
    app = create_app()
    app.dependency_overrides = {get_validate_reset_token_use_case: Crash, get_reset_password_use_case: Crash}
    client = TestClient(app, raise_server_exceptions=False)

    client.get("/api/v1/auth/password-reset/validate/PATHTOKEN123?token=QUERYTOKEN123")
    client.post("/api/v1/auth/password-reset/reset", json={"token": "BODYTOKEN456", "new_password": "PlainPass!9xyz"})
    sentry_sdk.flush()

    sent = json.dumps(sentry_events)
    assert len(sentry_events) == 2
    assert [secret for secret in SECRETS + ["$2b$"] if secret in sent] == []
    assert "/api/v1/auth/password-reset/validate/{token}" in sent
