from unittest.mock import patch

import pytest

from src.config.sentry import before_breadcrumb, before_send, configure_sentry


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
        before_send=before_send,
        before_breadcrumb=before_breadcrumb,
    )


@pytest.mark.unit
def test_before_send_redacts_email_addresses_anywhere_in_the_event():
    event = {
        "message": "Failed for ana@example.com",
        "logentry": {
            "message": "Sent to %s",
            "params": ["ana@example.com"],
            "formatted": "Sent to ana@example.com",
        },
        "exception": {
            "values": [{"type": "SMTPRecipientsRefused", "value": "{'ana@example.com': (550, 'no')}"}]
        },
    }

    redacted = before_send(event, {})

    assert "ana@example.com" not in str(redacted)
    assert redacted["logentry"]["formatted"] == "Sent to [email]"
    assert redacted["exception"]["values"][0]["type"] == "SMTPRecipientsRefused"


@pytest.mark.unit
def test_before_send_redacts_email_addresses_used_as_keys():
    frame_vars = {"senderrs": {"ana@example.com": "(550, 'no')"}}

    redacted = before_send({"exception": {"values": [{"stacktrace": {"frames": [{"vars": frame_vars}]}}]}}, {})

    assert "ana@example.com" not in str(redacted)


@pytest.mark.unit
def test_before_breadcrumb_redacts_email_addresses_in_the_message():
    crumb = {"category": "src.email", "message": "Email sent to ana.maria+club@sub.example.com"}

    assert before_breadcrumb(crumb, {})["message"] == "Email sent to [email]"


@pytest.mark.unit
def test_text_without_email_addresses_is_unchanged():
    event = {
        "message": "Error in scheduler loop: day is out of range for month",
        "level": "error",
        "extra": {"count": 3},
    }

    assert before_send(event, {}) == event
