"""Tests for MongoDB Payment Repository _to_domain / _to_document mapping of payment_method."""

import pytest
from unittest.mock import patch
from bson import ObjectId

from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.infrastructure.adapters.repositories.mongodb_payment_repository import MongoDBPaymentRepository


@pytest.mark.unit
@pytest.mark.repository
class TestMongoDBPaymentRepositoryPaymentMethod:
    """Test suite for payment_method field persistence in MongoDB Payment Repository."""

    @pytest.fixture
    def repository(self, mock_mongo_collection, mock_database):
        """Create repository instance with mocked database."""
        with patch(
            'src.infrastructure.adapters.repositories.mongodb_payment_repository.get_database',
            return_value=mock_database
        ):
            return MongoDBPaymentRepository()

    def test_to_domain_defaults_payment_method_to_redsys_when_field_absent(self, repository):
        """A document WITHOUT payment_method should map to PaymentMethod.REDSYS (non-destructive default)."""
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "member_id": "member-1",
            "club_id": "club-1",
            "payment_type": "annual_quota",
            "amount": 50.0,
            "status": "pending",
        }

        payment = repository._to_domain(doc)

        assert isinstance(payment, Payment)
        assert payment.payment_method == PaymentMethod.REDSYS

    def test_to_domain_reads_explicit_payment_method_value(self, repository):
        """A document WITH payment_method='cash' should map to PaymentMethod.CASH."""
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439012"),
            "member_id": "member-2",
            "club_id": "club-2",
            "payment_type": "annual_quota",
            "amount": 30.0,
            "status": "completed",
            "payment_method": "cash",
        }

        payment = repository._to_domain(doc)

        assert payment.payment_method == PaymentMethod.CASH

    def test_to_document_serialises_payment_method_as_string_value(self, repository):
        """A Payment with payment_method=CASH should produce a document with payment_method='cash'."""
        payment = Payment(
            member_id="member-3",
            club_id="club-3",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=75.0,
            payment_method=PaymentMethod.CASH,
        )

        doc = repository._to_document(payment)

        assert "payment_method" in doc
        assert doc["payment_method"] == "cash"

    def test_to_document_serialises_default_redsys_payment_method(self, repository):
        """A Payment with default payment_method (REDSYS) should produce payment_method='redsys'."""
        payment = Payment(
            member_id="member-4",
            club_id="club-4",
            payment_type=PaymentType.LICENSE,
            amount=20.0,
        )

        doc = repository._to_document(payment)

        assert "payment_method" in doc
        assert doc["payment_method"] == "redsys"
