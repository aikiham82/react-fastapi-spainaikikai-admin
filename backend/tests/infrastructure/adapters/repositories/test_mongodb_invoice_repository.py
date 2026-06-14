"""Tests for MongoDB Invoice Repository _to_document / _to_domain field mapping.

TDD: these tests were written BEFORE the fix to prove the AttributeError / TypeError
that blocked manual-payment invoice creation in production.
"""

import pytest
from unittest.mock import patch, MagicMock
from bson import ObjectId
from datetime import datetime

from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.infrastructure.adapters.repositories.mongodb_invoice_repository import (
    MongoDBInvoiceRepository,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def repository(mock_mongo_collection, mock_database):
    """Repository instance backed by a mocked Motor collection."""
    with patch(
        "src.infrastructure.adapters.repositories.mongodb_invoice_repository.get_database",
        return_value=mock_database,
    ):
        return MongoDBInvoiceRepository()


@pytest.fixture
def sample_invoice():
    """Minimal valid Invoice with two line items and calculated totals."""
    invoice = Invoice(
        invoice_number="2026-000001",
        payment_id="pay-abc123",
        member_id="member-xyz",
        club_id="club-001",
        customer_name="Ana Garcia",
        customer_email="ana@example.com",
        customer_address="Calle Mayor 1, Madrid",
        customer_tax_id="12345678A",
        notes="Test invoice",
    )
    invoice.add_line_item(description="Cuota anual", unit_price=100.0, quantity=1, tax_rate=21.0)
    invoice.add_line_item(description="Licencia", unit_price=50.0, quantity=2, tax_rate=10.0)
    # totals are recalculated by add_line_item; calling explicitly to be explicit
    invoice.calculate_totals()
    return invoice


# ---------------------------------------------------------------------------
# Unit: _to_document — no AttributeError on real entity fields
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.repository
class TestToDocument:
    """_to_document must only access fields that exist on Invoice."""

    def test_to_document_does_not_raise_attribute_error(self, repository, sample_invoice):
        """_to_document must NOT raise AttributeError (was raising invoice.license_id etc.)."""
        # This is the primary regression guard.  Before the fix this call raises:
        #   AttributeError: 'Invoice' object has no attribute 'license_id'
        doc = repository._to_document(sample_invoice)
        assert isinstance(doc, dict)

    def test_to_document_contains_correct_total_fields(self, repository, sample_invoice):
        """Document must use 'tax_total' and 'total', not 'tax_amount'/'total_amount'."""
        doc = repository._to_document(sample_invoice)

        assert "tax_total" in doc, "expected 'tax_total' key in document"
        assert "total" in doc, "expected 'total' key in document"
        assert "tax_amount" not in doc, "'tax_amount' is not an Invoice field"
        assert "total_amount" not in doc, "'total_amount' is not an Invoice field"

    def test_to_document_does_not_include_nonexistent_fields(self, repository, sample_invoice):
        """license_id and paid_date do not exist on Invoice and must not appear."""
        doc = repository._to_document(sample_invoice)

        assert "license_id" not in doc, "'license_id' is not an Invoice field"
        assert "paid_date" not in doc, "'paid_date' is not an Invoice field"

    def test_to_document_serialises_status_as_string(self, repository, sample_invoice):
        """InvoiceStatus enum must be stored as its string value."""
        doc = repository._to_document(sample_invoice)
        assert doc["status"] == "draft"

    def test_to_document_serialises_line_items_as_list_of_dicts(self, repository, sample_invoice):
        """line_items must be stored as plain dicts, not InvoiceLineItem objects."""
        doc = repository._to_document(sample_invoice)
        assert isinstance(doc["line_items"], list)
        assert len(doc["line_items"]) == 2
        first = doc["line_items"][0]
        assert set(first.keys()) >= {"description", "quantity", "unit_price", "tax_rate"}

    def test_to_document_total_values_match_entity(self, repository, sample_invoice):
        """Serialised numeric totals must match what the entity computed."""
        doc = repository._to_document(sample_invoice)

        assert doc["subtotal"] == pytest.approx(sample_invoice.subtotal)
        assert doc["tax_total"] == pytest.approx(sample_invoice.tax_total)
        assert doc["total"] == pytest.approx(sample_invoice.total)


# ---------------------------------------------------------------------------
# Unit: _to_domain — no TypeError when constructing Invoice from document
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.repository
class TestToDomain:
    """_to_domain must construct a valid Invoice without passing unknown kwargs."""

    def _make_document(self) -> dict:
        """Minimal document as written by the FIXED _to_document."""
        return {
            "_id": ObjectId("507f1f77bcf86cd799439099"),
            "invoice_number": "2026-000001",
            "payment_id": "pay-abc123",
            "member_id": "member-xyz",
            "club_id": "club-001",
            "customer_name": "Ana Garcia",
            "customer_email": "ana@example.com",
            "customer_address": "Calle Mayor 1, Madrid",
            "customer_tax_id": "12345678A",
            "line_items": [
                {"description": "Cuota anual", "quantity": 1, "unit_price": 100.0, "tax_rate": 21.0},
                {"description": "Licencia", "quantity": 2, "unit_price": 50.0, "tax_rate": 10.0},
            ],
            "subtotal": 200.0,
            "tax_total": 31.0,
            "total": 231.0,
            "status": "draft",
            "issue_date": datetime(2026, 6, 13),
            "due_date": None,
            "pdf_path": None,
            "pdf_generated_at": None,
            "notes": "Test invoice",
            "created_at": datetime(2026, 6, 13),
            "updated_at": datetime(2026, 6, 13),
        }

    def test_to_domain_does_not_raise_type_error(self, repository):
        """_to_domain must NOT raise TypeError (was passing license_id, tax_amount etc.)."""
        doc = self._make_document()
        # Before the fix this raises:
        #   TypeError: Invoice.__init__() got an unexpected keyword argument 'license_id'
        invoice = repository._to_domain(doc)
        assert isinstance(invoice, Invoice)

    def test_to_domain_returns_none_for_none_document(self, repository):
        """None input must return None without raising."""
        result = repository._to_domain(None)
        assert result is None

    def test_to_domain_maps_scalar_fields(self, repository):
        """Core scalar fields must survive the round-trip."""
        doc = self._make_document()
        invoice = repository._to_domain(doc)

        assert invoice.id == "507f1f77bcf86cd799439099"
        assert invoice.invoice_number == "2026-000001"
        assert invoice.payment_id == "pay-abc123"
        assert invoice.member_id == "member-xyz"
        assert invoice.club_id == "club-001"
        assert invoice.customer_name == "Ana Garcia"
        assert invoice.customer_email == "ana@example.com"

    def test_to_domain_maps_status_enum(self, repository):
        """status string in document must become InvoiceStatus enum."""
        doc = self._make_document()
        invoice = repository._to_domain(doc)
        assert invoice.status == InvoiceStatus.DRAFT

    def test_to_domain_maps_totals(self, repository):
        """tax_total and total must be read from the document correctly."""
        doc = self._make_document()
        invoice = repository._to_domain(doc)

        assert invoice.subtotal == pytest.approx(200.0)
        assert invoice.tax_total == pytest.approx(31.0)
        assert invoice.total == pytest.approx(231.0)

    def test_to_domain_maps_line_items(self, repository):
        """line_items list of dicts must become InvoiceLineItem instances."""
        doc = self._make_document()
        invoice = repository._to_domain(doc)

        assert len(invoice.line_items) == 2
        assert all(isinstance(li, InvoiceLineItem) for li in invoice.line_items)
        assert invoice.line_items[0].description == "Cuota anual"
        assert invoice.line_items[1].description == "Licencia"

    def test_to_domain_handles_missing_optional_fields_gracefully(self, repository):
        """Older documents without optional fields must not raise — use safe defaults."""
        sparse_doc = {
            "_id": ObjectId("507f1f77bcf86cd799439088"),
            "invoice_number": "2025-000001",
            "payment_id": "pay-old",
            "member_id": "member-old",
            # club_id, customer_*, line_items, totals, dates all absent
        }
        invoice = repository._to_domain(sparse_doc)
        assert isinstance(invoice, Invoice)
        assert invoice.club_id is None
        assert invoice.line_items == []
        assert invoice.subtotal == 0.0
        assert invoice.tax_total == 0.0
        assert invoice.total == 0.0


# ---------------------------------------------------------------------------
# Integration: full round-trip _to_document -> _to_domain
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.repository
class TestRoundTrip:
    """Build an Invoice, serialise to document, deserialise back, assert equality."""

    def test_round_trip_preserves_key_fields(self, repository, sample_invoice):
        """Key fields survive _to_document -> _to_domain without loss or corruption."""
        doc = repository._to_document(sample_invoice)

        # Simulate what MongoDB would return (add _id the way Motor does after insert)
        doc["_id"] = ObjectId("507f1f77bcf86cd799439077")

        restored = repository._to_domain(doc)

        assert restored.invoice_number == sample_invoice.invoice_number
        assert restored.payment_id == sample_invoice.payment_id
        assert restored.club_id == sample_invoice.club_id
        assert restored.customer_name == sample_invoice.customer_name
        assert restored.status == sample_invoice.status
        assert restored.tax_total == pytest.approx(sample_invoice.tax_total)
        assert restored.total == pytest.approx(sample_invoice.total)
        assert len(restored.line_items) == len(sample_invoice.line_items)

    def test_round_trip_line_item_values_preserved(self, repository, sample_invoice):
        """Individual line item fields must not be lost in serialisation."""
        doc = repository._to_document(sample_invoice)
        doc["_id"] = ObjectId("507f1f77bcf86cd799439076")
        restored = repository._to_domain(doc)

        orig_first = sample_invoice.line_items[0]
        rest_first = restored.line_items[0]
        assert rest_first.description == orig_first.description
        assert rest_first.quantity == orig_first.quantity
        assert rest_first.unit_price == pytest.approx(orig_first.unit_price)
        assert rest_first.tax_rate == pytest.approx(orig_first.tax_rate)

    def test_round_trip_status_issued_preserved(self, repository, sample_invoice):
        """An issued invoice must round-trip with ISSUED status."""
        sample_invoice.issue()
        doc = repository._to_document(sample_invoice)
        doc["_id"] = ObjectId("507f1f77bcf86cd799439075")
        restored = repository._to_domain(doc)
        assert restored.status == InvoiceStatus.ISSUED
