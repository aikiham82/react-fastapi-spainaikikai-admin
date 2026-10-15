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


MARKUP = '<img src="http://127.0.0.1:1/ssrf"/> & O<Brien'


@pytest.fixture
def no_image_fetch(monkeypatch):
    def refuse(*args, **kwargs):
        raise AssertionError("ReportLab tried to load an image from document text")

    monkeypatch.setattr("reportlab.lib.utils.ImageReader", refuse)
    monkeypatch.setattr("reportlab.platypus.paraparser.ImageReader", refuse, raising=False)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_the_invoice_pdf_prints_customer_text_literally(no_image_fetch):
    invoice = Invoice(
        id="invoice-1", invoice_number="2025-000002", payment_id="payment-1",
        member_id="club-1", club_id="club-1", customer_name=MARKUP, customer_address=MARKUP,
        customer_tax_id=MARKUP, notes=MARKUP, status=InvoiceStatus.ISSUED,
        issue_date=datetime(2026, 10, 15), subtotal=0, tax_total=0.0, total=0.0,
    )

    pdf = await PDFService().generate_invoice_pdf(
        invoice=invoice, company_name=MARKUP, company_address=MARKUP, company_tax_id=MARKUP
    )

    assert pdf.startswith(b"%PDF")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_the_license_pdf_prints_member_and_club_text_literally(no_image_fetch):
    pdf = await PDFService().generate_license_certificate_pdf(
        member_name=MARKUP, license_number=MARKUP, license_type=MARKUP,
        issue_date="2026-01-01", expiration_date="2026-12-31", club_name=MARKUP,
    )

    assert pdf.startswith(b"%PDF")


def test_formats_a_datetime_and_an_iso_string_alike():
    service = PDFService()

    assert service._format_date(datetime(2026, 10, 15, 7, 57)) == "15/10/2026"
    assert service._format_date("2026-10-15T07:57:00Z") == "15/10/2026"
    assert service._format_date(None) == ""


@pytest.fixture
def uncompressed_pdf(monkeypatch):
    monkeypatch.setattr("reportlab.rl_config.pageCompression", 0)


def pdf_string(text: str) -> bytes:
    return "".join(c if c.isascii() else f"\\{ord(c):03o}" for c in text).encode()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_the_invoice_pdf_writes_spanish_accents(uncompressed_pdf):
    invoice = Invoice(
        id="invoice-1", invoice_number="2025-000002", payment_id="payment-1",
        member_id="club-1", club_id="club-1", customer_name="Example Club",
        status=InvoiceStatus.ISSUED, issue_date=datetime(2026, 10, 15),
        subtotal=0, tax_total=0.0, total=0.0,
    )

    pdf = await PDFService().generate_invoice_pdf(
        invoice=invoice, company_name="Spain Aikikai", company_address="", company_tax_id=""
    )

    for text in ("Número", "Descripción", "electrónicamente"):
        assert pdf_string(text) in pdf


@pytest.mark.unit
@pytest.mark.asyncio
async def test_the_license_pdf_writes_spanish_accents(uncompressed_pdf):
    pdf = await PDFService().generate_license_certificate_pdf(
        member_name="Example Member", license_number="L-1", license_type="adulto",
        issue_date="2026-01-01", expiration_date="2026-12-31", club_name="Example Club",
    )

    for text in ("número", "categoría", "emisión"):
        assert pdf_string(text) in pdf
