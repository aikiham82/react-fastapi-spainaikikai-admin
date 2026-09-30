"""Tests that sending an email logs no recipient address."""

import logging
import smtplib
from unittest.mock import MagicMock, patch

import pytest

from src.application.ports.email_service import EmailMessage
from src.infrastructure.adapters.services.email_service import EmailService

RECIPIENT = "ana@example.com"
SMTP_SSL = "src.infrastructure.adapters.services.email_service.smtplib.SMTP_SSL"


@pytest.fixture
def email_service():
    with patch("src.infrastructure.adapters.services.email_service.get_email_settings") as settings:
        settings.return_value.from_email = "no-reply@example.com"
        settings.return_value.from_name = "Spain Aikikai"
        settings.return_value.smtp_host = "smtp.example.com"
        settings.return_value.smtp_port = 465
        settings.return_value.smtp_use_ssl = True
        return EmailService()


def _message() -> EmailMessage:
    return EmailMessage(to=[RECIPIENT], subject="Subject", body_html="<p>Body</p>")


def _smtp(sendmail_error=None) -> MagicMock:
    smtp = MagicMock()
    server = smtp.return_value.__enter__.return_value
    server.sendmail.side_effect = sendmail_error
    return smtp


@pytest.mark.unit
@pytest.mark.asyncio
class TestEmailServiceLogging:

    async def test_a_sent_email_is_logged_without_its_recipient(self, email_service, caplog):
        caplog.set_level(logging.INFO)

        with patch(SMTP_SSL, _smtp()):
            assert await email_service.send_email(_message()) is True

        assert RECIPIENT not in caplog.text
        assert "1 recipient(s)" in caplog.text

    async def test_a_refused_recipient_is_logged_without_its_address(self, email_service, caplog):
        refused = smtplib.SMTPRecipientsRefused({RECIPIENT: (550, b"mailbox unavailable")})

        with patch(SMTP_SSL, _smtp(refused)):
            assert await email_service.send_email(_message()) is False

        assert RECIPIENT not in caplog.text
        assert "SMTPRecipientsRefused" in caplog.text
