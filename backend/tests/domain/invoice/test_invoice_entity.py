"""Invoice entity tests."""

import pytest

from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus


class TestInvoiceEntity:
    """Test cases for Invoice domain entity."""

    def test_calculate_totals_sets_tax_total_and_total(self):
        """Test that calculate_totals() sets tax_total and total from line_items."""
        invoice = Invoice(
            payment_id="pay-001",
            member_id="member-001",
            line_items=[
                InvoiceLineItem(
                    description="Cuota Kyu 2026",
                    quantity=1,
                    unit_price=50.0,
                    tax_rate=21.0,
                )
            ],
        )

        invoice.calculate_totals()

        # subtotal = 1 * 50.0 = 50.0
        # tax_total = 50.0 * 0.21 = 10.5
        # total = 50.0 + 10.5 = 60.5
        assert invoice.subtotal == pytest.approx(50.0)
        assert invoice.tax_total == pytest.approx(10.5)
        assert invoice.total == pytest.approx(60.5)

    def test_calculate_totals_with_multiple_line_items(self):
        """Test that calculate_totals() aggregates multiple line items correctly."""
        invoice = Invoice(
            payment_id="pay-002",
            member_id="member-002",
            line_items=[
                InvoiceLineItem(
                    description="Cuota Kyu 2026",
                    quantity=1,
                    unit_price=50.0,
                    tax_rate=21.0,
                ),
                InvoiceLineItem(
                    description="Seguro Accidentes 2026",
                    quantity=1,
                    unit_price=30.0,
                    tax_rate=21.0,
                ),
            ],
        )

        invoice.calculate_totals()

        # subtotal = 50.0 + 30.0 = 80.0
        # tax_total = 80.0 * 0.21 = 16.8
        # total = 80.0 + 16.8 = 96.8
        assert invoice.subtotal == pytest.approx(80.0)
        assert invoice.tax_total == pytest.approx(16.8)
        assert invoice.total == pytest.approx(96.8)

    def test_calculate_totals_with_zero_tax_rate(self):
        """Test that calculate_totals() works with zero tax rate."""
        invoice = Invoice(
            payment_id="pay-003",
            member_id="member-003",
            line_items=[
                InvoiceLineItem(
                    description="Cuota exenta 2026",
                    quantity=1,
                    unit_price=100.0,
                    tax_rate=0.0,
                )
            ],
        )

        invoice.calculate_totals()

        assert invoice.subtotal == pytest.approx(100.0)
        assert invoice.tax_total == pytest.approx(0.0)
        assert invoice.total == pytest.approx(100.0)

    def test_calculate_totals_with_empty_line_items(self):
        """Test that calculate_totals() with no line items results in zeros."""
        invoice = Invoice(
            payment_id="pay-004",
            member_id="member-004",
        )

        invoice.calculate_totals()

        assert invoice.subtotal == pytest.approx(0.0)
        assert invoice.tax_total == pytest.approx(0.0)
        assert invoice.total == pytest.approx(0.0)
