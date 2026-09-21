"""Tests for the password reset email body."""

import pytest
from unittest.mock import AsyncMock, patch

from src.infrastructure.adapters.services.email_service import EmailService


@pytest.fixture
def email_service():
    """Email service with its settings stubbed."""
    with patch("src.infrastructure.adapters.services.email_service.get_email_settings") as settings:
        settings.return_value.from_email = "no-reply@spainaikikai.org"
        settings.return_value.from_name = "Spain Aikikai"
        settings.return_value.smtp_host = "smtp.example.com"
        settings.return_value.smtp_port = 465
        settings.return_value.smtp_user = "user"
        settings.return_value.smtp_password = "password"
        return EmailService()


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestPasswordResetEmail:
    """Test suite for what the reset email tells the account holder."""

    async def test_body_says_which_email_and_user_name_sign_in(self, email_service):
        """Test that the club learns the address it signs in with.

        The whole ticket exists because that address is usually not the one
        they know, so the email has to state it.
        """
        # Arrange
        email_service.send_email = AsyncMock(return_value=True)

        # Act
        await email_service.send_password_reset_email(
            to_email="jcarlosarevalo2@gmail.com",
            user_name="KUKI AIKIKAI",
            reset_url="https://admin.spainaikikai.es/reset-password?token=abc123"
        )

        # Assert
        message = email_service.send_email.await_args.args[0]
        assert "jcarlosarevalo2@gmail.com" in message.body_html
        assert "KUKI AIKIKAI" in message.body_html
        assert "jcarlosarevalo2@gmail.com" in message.body_text
        assert "KUKI AIKIKAI" in message.body_text
