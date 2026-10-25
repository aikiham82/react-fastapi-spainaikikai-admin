"""Audit attributes survive Sentry's server-side scrubbing."""

from unittest.mock import patch

import pytest

from src.infrastructure.web import audit as audit_module


@pytest.mark.unit
def test_sends_the_event_as_the_message_and_the_rest_as_attributes():
    with patch.object(audit_module, "logger") as logger:
        audit_module.audit("auth.login.failed", level="warning", reason="incorrect")

    logger.warning.assert_called_once_with("auth.login.failed", attributes={"reason": "incorrect"})


@pytest.mark.unit
@pytest.mark.parametrize("value", ["unknown_account", "inactive", "incorrect", "not_found", "expired", "used", "validate", "reset"])
def test_no_attribute_value_trips_sentrys_default_scrubber(value):
    """Sentry replaces any value containing these words with [Filtered], which makes the event useless to count."""
    assert not any(word in value for word in ("password", "passwd", "secret", "auth", "token", "credential", "session", "bearer"))
