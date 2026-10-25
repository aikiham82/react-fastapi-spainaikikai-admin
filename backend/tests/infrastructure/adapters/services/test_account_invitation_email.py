"""Tests for the email that gives a member their web access."""

import pytest
from unittest.mock import AsyncMock, patch

from src.infrastructure.adapters.services.email_service import EmailService


@pytest.fixture
def email_service():
    with patch("src.infrastructure.adapters.services.email_service.get_email_settings") as settings:
        settings.return_value.from_email = "no-reply@example.com"
        settings.return_value.from_name = "Spain Aikikai"
        settings.return_value.smtp_host = "smtp.example.com"
        settings.return_value.smtp_port = 465
        settings.return_value.smtp_user = "user"
        settings.return_value.smtp_password = "password"
        service = EmailService()
    service.send_email = AsyncMock(return_value=True)
    return service


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestAccountInvitationEmail:

    async def test_tells_the_member_how_to_sign_in(self, email_service):
        await email_service.send_account_invitation_email(
            to_email="ana@example.com",
            member_name="Ana Ejemplo",
            url="https://admin.example.com/reset-password?token=abc",
        )

        message = email_service.send_email.await_args.args[0]
        assert message.to == ["ana@example.com"]
        assert message.subject == "Tu acceso a Spain Aikikai Admin"
        for body in (message.body_html, message.body_text):
            assert "Ana Ejemplo" in body
            assert "ana@example.com" in body
            assert "https://admin.example.com/reset-password?token=abc" in body

    async def test_escapes_the_member_name_in_the_html(self, email_service):
        await email_service.send_account_invitation_email(
            to_email="ana@example.com",
            member_name='<a href="https://evil.example.com">Ana</a>',
            url="https://admin.example.com/reset-password?token=abc",
        )

        message = email_service.send_email.await_args.args[0]
        assert '<a href="https://evil.example.com">' not in message.body_html
