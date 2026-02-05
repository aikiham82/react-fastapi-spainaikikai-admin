"""MemberPayment domain entity for tracking individual member payments."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class MemberPaymentStatus(str, Enum):
    """Member payment status enumeration."""
    PENDING = "pending"
    COMPLETED = "completed"
    REFUNDED = "refunded"


class MemberPaymentType(str, Enum):
    """Types of member payments mapped to annual payment categories."""
    LICENCIA_KYU = "licencia_kyu"
    LICENCIA_KYU_INFANTIL = "licencia_kyu_infantil"
    LICENCIA_DAN = "licencia_dan"
    TITULO_FUKUSHIDOIN = "titulo_fukushidoin"
    TITULO_SHIDOIN = "titulo_shidoin"
    SEGURO_ACCIDENTES = "seguro_accidentes"
    SEGURO_RC = "seguro_rc"


# Mapping from annual payment item types to member payment types
ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE = {
    "kyu": MemberPaymentType.LICENCIA_KYU,
    "kyu_infantil": MemberPaymentType.LICENCIA_KYU_INFANTIL,
    "dan": MemberPaymentType.LICENCIA_DAN,
    "fukushidoin_shidoin": MemberPaymentType.TITULO_FUKUSHIDOIN,
    "seguro_accidentes": MemberPaymentType.SEGURO_ACCIDENTES,
    "seguro_rc": MemberPaymentType.SEGURO_RC,
}


@dataclass
class MemberPayment:
    """Domain entity representing an individual member's payment record.

    This entity tracks payments at the member level, providing traceability
    for all federative fees per member. It links to the parent club payment
    that was processed through Redsys.

    Note: club_id has been removed. To filter by club, look up the member_id
    and get the club_id from the member entity.
    """
    id: Optional[str] = None
    payment_id: str = ""          # Parent club payment ID
    member_id: str = ""           # Individual member
    payment_year: int = 0
    payment_type: MemberPaymentType = MemberPaymentType.LICENCIA_KYU
    concept: str = ""             # Human-readable description
    amount: float = 0.0
    status: MemberPaymentStatus = MemberPaymentStatus.PENDING
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate member payment entity."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()

        if not self.payment_id:
            raise ValueError("Parent payment ID is required")
        if not self.member_id:
            raise ValueError("Member ID is required")
        if self.payment_year < 1900 or self.payment_year > 2100:
            raise ValueError("Payment year must be between 1900 and 2100")
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def complete(self) -> None:
        """Mark payment as completed."""
        if self.status != MemberPaymentStatus.PENDING:
            raise ValueError("Only pending payments can be completed")
        self.status = MemberPaymentStatus.COMPLETED
        self.updated_at = datetime.now()

    def refund(self) -> None:
        """Mark payment as refunded."""
        if self.status != MemberPaymentStatus.COMPLETED:
            raise ValueError("Only completed payments can be refunded")
        self.status = MemberPaymentStatus.REFUNDED
        self.updated_at = datetime.now()

    @property
    def is_completed(self) -> bool:
        """Check if payment is completed."""
        return self.status == MemberPaymentStatus.COMPLETED

    @property
    def is_license_payment(self) -> bool:
        """Check if this is a license-related payment."""
        return self.payment_type in [
            MemberPaymentType.LICENCIA_KYU,
            MemberPaymentType.LICENCIA_KYU_INFANTIL,
            MemberPaymentType.LICENCIA_DAN,
            MemberPaymentType.TITULO_FUKUSHIDOIN,
            MemberPaymentType.TITULO_SHIDOIN,
        ]

    @property
    def is_insurance_payment(self) -> bool:
        """Check if this is an insurance-related payment."""
        return self.payment_type in [
            MemberPaymentType.SEGURO_ACCIDENTES,
            MemberPaymentType.SEGURO_RC,
        ]
