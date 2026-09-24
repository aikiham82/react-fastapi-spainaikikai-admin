from unittest.mock import patch

import pytest

from src.config.sentry import configure_sentry


@pytest.mark.unit
def test_does_not_init_sentry_without_dsn(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)

    with patch("src.config.sentry.sentry_sdk.init") as init:
        assert configure_sentry() is False

    init.assert_not_called()


@pytest.mark.unit
def test_inits_sentry_without_pii_when_dsn_is_set(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://key@example.com/1")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")

    with patch("src.config.sentry.sentry_sdk.init") as init:
        assert configure_sentry() is True

    init.assert_called_once_with(
        dsn="https://key@example.com/1",
        environment="production",
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
