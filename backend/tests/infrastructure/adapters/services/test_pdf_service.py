"""Tests for the ReportLab PDF service."""

from datetime import datetime

import pytest

from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.infrastructure.adapters.services.pdf_service import PDFService


@pytest.mark.unit
@pytest.mark.asyncio
async def test_generates_the_pdf_of_a_stored_invoice():
    invoice = Invoice(
        id="invoice-1", invoice_number="2025-000002", payment_id="payment-1",
        member_id="club-1", club_id="club-1", customer_name="Example Club",
        status=InvoiceStatus.ISSUED, issue_date=datetime(2026, 10, 15, 7, 57, 17),
        line_items=[InvoiceLineItem(description="Licencia DAN", quantity=3, unit_price=20)],
        subtotal=60, tax_total=0.0, total=60.0,
    )

    pdf = await PDFService().generate_invoice_pdf(
        invoice=invoice, company_name="Spain Aikikai", company_address="", company_tax_id=""
    )

    assert pdf.startswith(b"%PDF")


def test_formats_a_datetime_and_an_iso_string_alike():
    service = PDFService()

    assert service._format_date(datetime(2026, 10, 15, 7, 57)) == "15/10/2026"
    assert service._format_date("2026-10-15T07:57:00Z") == "15/10/2026"
    assert service._format_date(None) == ""
