from dataclasses import dataclass
from datetime import datetime, date
from typing import Optional
from enum import Enum


class InsuranceType(str, Enum):
    """Insurance type enumeration."""
    ACCIDENT = "accident"
    CIVIL_LIABILITY = "civil_liability"


class InsuranceStatus(str, Enum):
    """Insurance status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    CANCELLED = "cancelled"


@dataclass
class Insurance:
    """Insurance domain entity representing accident or civil liability insurance."""
    id: Optional[str] = None
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    insurance_type: InsuranceType = InsuranceType.ACCIDENT
    policy_number: str = ""
    insurance_company: str = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: InsuranceStatus = InsuranceStatus.ACTIVE
    coverage_amount: Optional[float] = None
    payment_id: Optional[str] = None
    documents: Optional[str] = None  # Path to insurance document
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate insurance entity."""
        if not self.policy_number or not self.policy_number.strip():
            raise ValueError("Policy number cannot be empty")
        if not self.insurance_company or not self.insurance_company.strip():
            raise ValueError("Insurance company cannot be empty")
        if self.coverage_amount and self.coverage_amount < 0:
            raise ValueError("Coverage amount cannot be negative")
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("Start date must be before end date")

    def activate(self) -> None:
        """Activate the insurance."""
        if not self.start_date or not self.end_date:
            raise ValueError("Start and end dates must be set before activation")
        self.status = InsuranceStatus.ACTIVE

    def cancel(self) -> None:
        """Cancel the insurance."""
        self.status = InsuranceStatus.CANCELLED

    def expire(self) -> None:
        """Mark the insurance as expired."""
        self.status = InsuranceStatus.EXPIRED

    def is_expired(self) -> bool:
        """Check if insurance is expired."""
        if self.end_date:
            return datetime.now() > self.end_date
        return False

    def is_active(self) -> bool:
        """Check if insurance is currently active."""
        return (
            self.status == InsuranceStatus.ACTIVE and
            not self.is_expired()
        )

    def check_and_update_status(self) -> None:
        """Check and update insurance status based on end date."""
        if self.is_expired() and self.status == InsuranceStatus.ACTIVE:
            self.status = InsuranceStatus.EXPIRED

    def update_dates(self, start_date: datetime, end_date: datetime) -> None:
        """Update insurance dates."""
        if start_date > end_date:
            raise ValueError("Start date must be before end date")
        self.start_date = start_date
        self.end_date = end_date

    def update_coverage(self, coverage_amount: float) -> None:
        """Update insurance coverage amount."""
        if coverage_amount < 0:
            raise ValueError("Coverage amount cannot be negative")
        self.coverage_amount = coverage_amount

    def get_days_until_expiry(self) -> int:
        """Get days until insurance expires."""
        if not self.end_date:
            return 0
        delta = self.end_date - datetime.now()
        return max(0, delta.days)

    def is_expiring_soon(self, days_threshold: int = 30) -> bool:
        """Check if insurance is expiring soon."""
        days_until = self.get_days_until_expiry()
        return 0 < days_until <= days_threshold
