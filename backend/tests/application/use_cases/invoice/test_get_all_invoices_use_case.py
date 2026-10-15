"""Listing invoices applies every filter it is given."""

from datetime import date
from unittest.mock import AsyncMock

import pytest

from src.application.use_cases.invoice.get_all_invoices_use_case import GetAllInvoicesUseCase
from src.domain.entities.invoice import InvoiceStatus


@pytest.mark.unit
@pytest.mark.asyncio
async def test_status_and_dates_filter_together():
    repository = AsyncMock()

    await GetAllInvoicesUseCase(repository).execute(
        status=InvoiceStatus.PAID, start_date=date(2026, 10, 1), end_date=date(2026, 10, 15)
    )

    repository.find_by_date_range.assert_awaited_once_with(
        date(2026, 10, 1), date(2026, 10, 15), 0, status=InvoiceStatus.PAID
    )
    repository.find_by_status.assert_not_called()
