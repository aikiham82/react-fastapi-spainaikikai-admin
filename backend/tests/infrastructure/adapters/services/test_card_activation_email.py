"""The activation email points to where the member can really see their card."""

from unittest.mock import AsyncMock, patch

import pytest

from src.infrastructure.adapters.services.email_service import EmailService


@pytest.mark.unit
@pytest.mark.asyncio
async def test_the_activation_email_offers_the_card_in_the_app_or_on_the_web():
    with patch("src.infrastructure.adapters.services.email_service.get_email_settings"):
        service = EmailService()
    service.send_email = AsyncMock(return_value=True)

    await service.send_card_activation_email("ana@example.com", "Ana", "https://example.com/reset-password?token=t")

    message = service.send_email.call_args.args[0]
    assert "en la app Spain Aikikai o en la web" in message.body_text
    assert "en la app Spain Aikikai o en la web" in message.body_html
