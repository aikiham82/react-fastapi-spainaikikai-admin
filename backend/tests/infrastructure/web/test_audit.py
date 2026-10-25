"""Audit events go out as Sentry logs."""

from unittest.mock import patch

import pytest

from src.infrastructure.web import audit as audit_module


@pytest.mark.unit
def test_sends_the_event_as_the_message_and_the_rest_as_attributes():
    with patch.object(audit_module, "logger") as logger:
        audit_module.audit("auth.login.failed", level="warning", reason="incorrect")

    logger.warning.assert_called_once_with("auth.login.failed", attributes={"reason": "incorrect"})
