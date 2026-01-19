"""Invoice domain entity for payment receipts."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class InvoiceStatus(str, Enum):
    """Invoice status enumeration."""
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass
class InvoiceLineItem:
    """Invoice line item representing a single charge."""
    description: str
    quantity: int = 1
    unit_price: float = 0.0
    tax_rate: float = 0.0

    @property
    def subtotal(self) -> float:
        """Calculate subtotal without tax."""
        return self.quantity * self.unit_price

    @property
    def tax_amount(self) -> float:
        """Calculate tax amount."""
        return self.subtotal * (self.tax_rate / 100)

    @property
    def total(self) -> float:
        """Calculate total including tax."""
        return self.subtotal + self.tax_amount


@dataclass
class Invoice:
    """Invoice domain entity representing a payment receipt.

    Invoice numbers follow the format: YYYY-NNNNNN
    Where YYYY is the year and NNNNNN is a 6-digit sequential number.
    Example: 2026-000001
    """

    id: Optional[str] = None
    invoice_number: str = ""
    payment_id: str = ""
    member_id: str = ""
    club_id: Optional[str] = None

    # Customer information
    customer_name: str = ""
    customer_email: str = ""
    customer_address: str = ""
    customer_tax_id: str = ""

    # Invoice details
    status: InvoiceStatus = InvoiceStatus.DRAFT
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

    # Line items
    line_items: List[InvoiceLineItem] = field(default_factory=list)

    # Totals
    subtotal: float = 0.0
    tax_total: float = 0.0
    total: float = 0.0

    # PDF storage
    pdf_path: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None

    # Notes and metadata
    notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Initialize invoice and validate."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        self.issue_date = self.issue_date or datetime.now()

        if not self.payment_id:
            raise ValueError("Payment ID is required")
        if not self.member_id:
            raise ValueError("Member ID is required")

    def add_line_item(
        self,
        description: str,
        unit_price: float,
        quantity: int = 1,
        tax_rate: float = 0.0
    ) -> None:
        """Add a line item to the invoice.

        Args:
            description: Description of the item.
            unit_price: Price per unit.
            quantity: Number of units.
            tax_rate: Tax rate percentage (e.g., 21 for 21%).
        """
        item = InvoiceLineItem(
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            tax_rate=tax_rate
        )
        self.line_items.append(item)
        self._recalculate_totals()

    def remove_line_item(self, index: int) -> None:
        """Remove a line item by index.

        Args:
            index: Index of the line item to remove.

        Raises:
            IndexError: If index is out of range.
        """
        if 0 <= index < len(self.line_items):
            self.line_items.pop(index)
            self._recalculate_totals()
        else:
            raise IndexError(f"Line item index {index} out of range")

    def _recalculate_totals(self) -> None:
        """Recalculate invoice totals from line items."""
        self.subtotal = sum(item.subtotal for item in self.line_items)
        self.tax_total = sum(item.tax_amount for item in self.line_items)
        self.total = self.subtotal + self.tax_total
        self.updated_at = datetime.now()

    def issue(self) -> None:
        """Issue the invoice (mark as sent to customer)."""
        if self.status != InvoiceStatus.DRAFT:
            raise ValueError(f"Cannot issue invoice in status {self.status}")
        self.status = InvoiceStatus.ISSUED
        self.issue_date = datetime.now()
        self.updated_at = datetime.now()

    def mark_as_paid(self) -> None:
        """Mark the invoice as paid."""
        if self.status == InvoiceStatus.CANCELLED:
            raise ValueError("Cannot mark cancelled invoice as paid")
        self.status = InvoiceStatus.PAID
        self.updated_at = datetime.now()

    def cancel(self) -> None:
        """Cancel the invoice."""
        if self.status == InvoiceStatus.PAID:
            raise ValueError("Cannot cancel paid invoice")
        self.status = InvoiceStatus.CANCELLED
        self.updated_at = datetime.now()

    def set_pdf_path(self, path: str) -> None:
        """Set the path to the generated PDF.

        Args:
            path: File path where PDF is stored.
        """
        self.pdf_path = path
        self.pdf_generated_at = datetime.now()
        self.updated_at = datetime.now()

    @staticmethod
    def generate_invoice_number(year: int, sequence: int) -> str:
        """Generate an invoice number.

        Args:
            year: The year for the invoice.
            sequence: The sequential number within the year.

        Returns:
            Invoice number in format YYYY-NNNNNN.
        """
        return f"{year}-{sequence:06d}"

    @property
    def is_paid(self) -> bool:
        """Check if invoice is paid."""
        return self.status == InvoiceStatus.PAID

    @property
    def has_pdf(self) -> bool:
        """Check if PDF has been generated."""
        return self.pdf_path is not None and self.pdf_generated_at is not None
