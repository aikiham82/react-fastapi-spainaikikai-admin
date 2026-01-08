"""Payment entity tests."""

import pytest
from datetime import datetime, timedelta

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType


class TestPaymentEntity:
    """Test cases for Payment domain entity."""

    def test_payment_creation_valid(self):
        """Test valid payment creation."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0
        )
        
        assert payment.member_id == "member-id"
        assert payment.club_id == "club-id"
        assert payment.payment_type == PaymentType.ANNUAL_QUOTA
        assert payment.amount == 100.0
        assert payment.status == PaymentStatus.PENDING
        assert payment.related_entity_id is None

    def test_payment_creation_with_related_entity(self):
        """Test payment creation with related entity."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.LICENSE,
            amount=50.0,
            related_entity_id="license-id"
        )
        
        assert payment.related_entity_id == "license-id"
        assert payment.payment_type == PaymentType.LICENSE

    def test_payment_creation_invalid_amount(self):
        """Test payment creation with negative amount raises error."""
        with pytest.raises(ValueError, match="Payment amount cannot be negative"):
            Payment(
                member_id="member-id",
                club_id="club-id",
                payment_type=PaymentType.ANNUAL_QUOTA,
                amount=-50.0
            )

    def test_payment_creation_invalid_refund_amount(self):
        """Test payment creation with invalid refund amount raises error."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            amount=100.0,
            refund_amount=200.0
        )
        
        # This will be validated in __post_init__
        assert payment.refund_amount > payment.amount

    def test_payment_creation_with_refund_amount(self):
        """Test payment creation with refund amount."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            refund_amount=50.0
        )
        
        assert payment.refund_amount == 50.0

    def test_payment_mark_as_processing(self):
        """Test marking payment as processing."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0
        )
        
        payment.mark_as_processing()
        assert payment.status == PaymentStatus.PROCESSING

    def test_payment_mark_as_processing_invalid_state(self):
        """Test marking pending payment as processing raises error."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PENDING
        )
        
        with pytest.raises(ValueError, match="Cannot mark.*as processing"):
            payment.mark_as_processing()

    def test_payment_complete(self):
        """Test completing a payment."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PROCESSING
        )
        
        transaction_id = "TXN-12345"
        redsys_response = "Success"
        
        payment.complete_payment(transaction_id, redsys_response)
        
        assert payment.status == PaymentStatus.COMPLETED
        assert payment.transaction_id == transaction_id
        assert payment.redsys_response == redsys_response
        assert payment.payment_date is not None

    def test_payment_complete_invalid_state(self):
        """Test completing payment with invalid state raises error."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PENDING
        )
        
        with pytest.raises(ValueError, match="Cannot complete.*status is not PROCESSING"):
            payment.complete_payment("TXN-12345", "Response data")

    def test_payment_fail(self):
        """Test failing a payment."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PROCESSING
        )
        
        error_message = "Payment failed"
        transaction_id = "TXN-FAILED-123"
        
        payment.fail_payment(error_message)
        
        assert payment.status == PaymentStatus.FAILED
        assert payment.error_message == error_message
        assert payment.transaction_id == transaction_id
        assert payment.payment_date is None

    def test_payment_fail_invalid_state(self):
        """Test failing payment with invalid state raises error."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PENDING
        )
        
        with pytest.raises(ValueError, match="Cannot fail.*status is not PROCESSING"):
            payment.fail_payment("Error")

    def test_payment_cancel(self):
        """Test canceling a payment."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PROCESSING
        )
        
        payment.cancel_payment()
        assert payment.status == PaymentStatus.CANCELLED

    def test_payment_cancel_invalid_state(self):
        """Test canceling payment with invalid state raises error."""
        payment = Payment(
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.PENDING
        )
        
        with pytest.raises(ValueError, match="Cannot cancel.*status is not PROCESSING"):
            payment.cancel_payment()

    def test_payment_refund(self):
        """Test refunding a payment."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        payment.refund_payment(50.0)
        
        assert payment.status == PaymentStatus.REFUNDED
        assert payment.refund_amount == 50.0
        assert payment.refund_date is not None

    def test_payment_refund_full_amount(self):
        """Test refunding full payment amount."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        payment.refund_payment()
        
        assert payment.status == PaymentStatus.REFUNDED
        assert payment.refund_amount == 100.0
        assert payment.refund_date is not None

    def test_payment_refund_partial_amount(self):
        """Test refunding partial payment amount."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        payment.refund_payment(30.0)
        
        assert payment.status == PaymentStatus.REFUNDED
        assert payment.refund_amount == 30.0
        assert payment.refund_date is not None

    def test_payment_refund_invalid_state(self):
        """Test refunding non-refundable payment raises error."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.CANCELLED
        )
        
        with pytest.raises(ValueError, match="Cannot refund.*not refundable"):
            payment.refund_payment()

    def test_payment_refund_partial_invalid_state(self):
        """Test refunding failed payment raises error."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.FAILED
        )
        
        with pytest.raises(ValueError, match="Cannot refund.*not refundable"):
            payment.refund_payment()

    def test_payment_refund_amount_exceeds_total(self):
        """Test refunding amount exceeding total raises error."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        with pytest.raises(ValueError, match="Refund amount.*exceeds.*amount"):
            payment.refund_payment(150.0)

    def test_payment_is_refundable(self):
        """Test is refundable method."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        assert payment.is_refundable() is True

    def test_payment_is_refundable_cancelled(self):
        """Test is refundable on cancelled payment."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.CANCELLED
        )
        
        assert payment.is_refundable() is False

    def test_payment_is_refundable_failed(self):
        """Test is refundable on failed payment."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.FAILED
        )
        
        assert payment.is_refundable() is False

    def test_payment_get_refundable_amount(self):
        """Test get refundable amount method."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=30.0,
            refund_date=datetime.utcnow()
        )
        
        assert payment.get_refundable_amount() == 70.0

    def test_payment_get_refundable_amount_no_refund(self):
        """Test get refundable amount with no refunds."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=None,
            refund_date=None
        )
        
        assert payment.get_refundable_amount() == 100.0

    def test_payment_get_refundable_amount_partial_refund(self):
        """Test get refundable amount with partial refund."""
        payment = Payment(
            id="payment-id",
            member_id="member-id",
            club_id="club-id",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_date=datetime.utcnow(),
            transaction_id="TXN-12345",
            redsys_response="Success",
            refund_amount=30.0,
            refund_date=datetime.utcnow()
        )
        
        assert payment.get_refundable_amount() == 70.0
