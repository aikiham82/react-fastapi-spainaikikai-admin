"""Tests for SendLicenseExpirationNotificationsUseCase."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.notification.send_license_expiration_notifications_use_case import (
    SendLicenseExpirationNotificationsUseCase,
)
from src.domain.entities.license import License, LicenseStatus
from src.domain.entities.member import Member


def _license(expiration_date, status=LicenseStatus.ACTIVE) -> License:
    return License(
        id="lic-1",
        license_number="LIC-0001",
        member_id="mem-1",
        grade="1 kyu",
        status=status,
        expiration_date=expiration_date,
    )


def _use_case(licenses):
    license_repository = AsyncMock()
    license_repository.find_all.return_value = licenses
    member_repository = AsyncMock()
    member_repository.find_by_id.return_value = Member(
        id="mem-1", first_name="Ana", last_name="Example", email="ana@example.com"
    )
    email_service = AsyncMock()
    use_case = SendLicenseExpirationNotificationsUseCase(
        license_repository, member_repository, email_service
    )
    return use_case, email_service


@pytest.mark.unit
@pytest.mark.asyncio
class TestSendLicenseExpirationNotificationsUseCase:

    async def test_notifies_active_license_expiring_in_seven_days(self):
        expiration = datetime.utcnow() + timedelta(days=7)
        use_case, email_service = _use_case([_license(expiration)])

        result = await use_case.execute()

        assert result["errors"] == []
        assert result["notifications_sent"] == 1
        sent = email_service.send_email.await_args.args[0]
        assert sent.to == ["ana@example.com"]
        assert expiration.strftime("%d/%m/%Y") in sent.body_html

    async def test_skips_licenses_without_expiration_or_not_active(self):
        expiration = datetime.utcnow() + timedelta(days=15)
        use_case, email_service = _use_case([
            _license(None),
            _license(expiration, status=LicenseStatus.REVOKED),
        ])

        result = await use_case.execute()

        assert result["errors"] == []
        assert result["notifications_sent"] == 0
        email_service.send_email.assert_not_awaited()
