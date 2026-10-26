"""Every value rendered into an email is HTML-escaped."""

import pytest
from unittest.mock import AsyncMock, patch

from src.infrastructure.adapters.services.email_service import EmailService

HOSTILE_NAME = 'Aikido & <b>Zen</b> "O\'Brien"'
URL_WITH_QUERY = "https://admin.example.com/renew?token=abc&step=2"


@pytest.fixture
def email_service():
    with patch("src.infrastructure.adapters.services.email_service.get_email_settings"):
        service = EmailService()
    service.send_email = AsyncMock(return_value=True)
    return service


def _sends(service):
    return {
        "payment confirmation": lambda name: service.send_payment_confirmation(
            to_email="ana@example.com", member_name=name, payment_amount=30, license_type=name
        ),
        "license expiration": lambda name: service.send_license_expiration_reminder(
            to_email="ana@example.com", member_name=name, license_number=name,
            expiration_date="2026-12-31", days_remaining=10, renewal_url=URL_WITH_QUERY,
        ),
        "payment failed": lambda name: service.send_payment_failed_notification(
            to_email="ana@example.com", member_name=name, error_message=name, retry_url=URL_WITH_QUERY
        ),
        "invoice": lambda name: service.send_invoice(
            to_email="ana@example.com", member_name=name, invoice_number="F-1", invoice_pdf=b"%PDF"
        ),
        "password reset": lambda name: service.send_password_reset_email(
            to_email="ana@example.com", user_name=name, reset_url=URL_WITH_QUERY
        ),
        "account invitation": lambda name: service.send_account_invitation_email(
            to_email="ana@example.com", member_name=name, url=URL_WITH_QUERY
        ),
    }


TEMPLATES = ["payment confirmation", "license expiration", "payment failed", "invoice", "password reset", "account invitation"]


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestEmailEscaping:

    @pytest.mark.parametrize("template", TEMPLATES)
    async def test_escapes_a_hostile_name(self, email_service, template):
        await _sends(email_service)[template](HOSTILE_NAME)

        html = email_service.send_email.await_args.args[0].body_html
        assert "<b>Zen</b>" not in html
        assert "Aikido &amp; &lt;b&gt;Zen&lt;/b&gt;" in html

    @pytest.mark.parametrize("template", TEMPLATES)
    async def test_keeps_a_plain_name_as_is(self, email_service, template):
        await _sends(email_service)[template]("Ana Ejemplo")

        assert "Ana Ejemplo" in email_service.send_email.await_args.args[0].body_html

    @pytest.mark.parametrize("template", ["license expiration", "payment failed", "password reset", "account invitation"])
    async def test_keeps_links_with_a_query_working(self, email_service, template):
        await _sends(email_service)[template]("Ana Ejemplo")

        assert 'href="https://admin.example.com/renew?token=abc&amp;step=2"' in email_service.send_email.await_args.args[0].body_html
