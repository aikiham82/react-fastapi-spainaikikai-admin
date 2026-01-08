from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentType(str, Enum):
    """Payment type enumeration."""
    LICENSE = "license"
    ACCIDENT_INSURANCE = "accident_insurance"
    CIVIL_LIABILITY_INSURANCE = "civil_liability_insurance"
    ANNUAL_QUOTA = "annual_quota"
    SEMINAR = "seminar"


@dataclass
class Payment:
    """Payment domain entity representing a payment transaction."""
    id: Optional[str] = None
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    payment_type: PaymentType = PaymentType.ANNUAL_QUOTA
    amount: float = 0.0
    status: PaymentStatus = PaymentStatus.PENDING
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None
    redsys_response: Optional[str] = None
    error_message: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_date: Optional[datetime] = None
    related_entity_id: Optional[str] = None  # license_id, seminar_id, etc.
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate payment entity."""
        if self.amount < 0:
            raise ValueError("Payment amount cannot be negative")
        if self.refund_amount and self.refund_amount < 0:
            raise ValueError("Refund amount cannot be negative")
        if self.refund_amount and self.refund_amount > self.amount:
            raise ValueError("Refund amount cannot exceed payment amount")

    def mark_as_processing(self) -> None:
        """Mark payment as processing."""
        if self.status != PaymentStatus.PENDING:
            raise ValueError("Only pending payments can be marked as processing")
        self.status = PaymentStatus.PROCESSING

    def complete_payment(self, transaction_id: str, redsys_response: str) -> None:
        """Complete the payment."""
        if self.status != PaymentStatus.PROCESSING:
            raise ValueError("Only processing payments can be completed")
        if not transaction_id:
            raise ValueError("Transaction ID cannot be empty")
        self.status = PaymentStatus.COMPLETED
        self.transaction_id = transaction_id
        self.redsys_response = redsys_response
        self.payment_date = datetime.now()

    def fail_payment(self, error_message: str) -> None:
        """Mark payment as failed."""
        if self.status not in [PaymentStatus.PROCESSING, PaymentStatus.PENDING]:
            raise ValueError("Only processing or pending payments can fail")
        self.status = PaymentStatus.FAILED
        self.error_message = error_message

    def cancel_payment(self) -> None:
        """Cancel the payment."""
        if self.status not in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]:
            raise ValueError("Only pending or processing payments can be cancelled")
        self.status = PaymentStatus.CANCELLED

    def refund_payment(self, refund_amount: Optional[float] = None) -> None:
        """Refund the payment."""
        if self.status != PaymentStatus.COMPLETED:
            raise ValueError("Only completed payments can be refunded")
        if refund_amount and refund_amount > self.amount:
            raise ValueError("Refund amount cannot exceed payment amount")

        self.status = PaymentStatus.REFUNDED
        self.refund_amount = refund_amount if refund_amount else self.amount
        self.refund_date = datetime.now()

    def is_refundable(self) -> bool:
        """Check if payment can be refunded."""
        return self.status == PaymentStatus.COMPLETED

    def get_refundable_amount(self) -> float:
        """Get refundable amount."""
        if not self.is_refundable():
            return 0.0
        if self.refund_amount:
            return self.amount - self.refund_amount
        return self.amount
