"""Service port interfaces for Redsys payment gateway operations."""

from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
from enum import Enum


class RedsysTransactionType(str, Enum):
    """Redsys transaction types."""
    AUTHORIZATION = "0"  # Standard payment
    PREAUTHORIZATION = "1"
    PREAUTHORIZATION_CONFIRMATION = "2"
    REFUND = "3"
    RECURRING_AUTHORIZATION = "5"


@dataclass
class RedsysPaymentRequest:
    """Data for initiating a Redsys payment."""
    order_id: str  # 4 numeric chars minimum, max 12 chars total
    amount_cents: int  # Amount in cents (e.g., 5000 for 50.00€)
    description: str
    merchant_url: str  # Webhook notification URL
    ok_url: str  # Redirect URL on success
    ko_url: str  # Redirect URL on failure
    transaction_type: RedsysTransactionType = RedsysTransactionType.AUTHORIZATION
    consumer_language: str = "001"  # Spanish
    product_description: Optional[str] = None


@dataclass
class RedsysPaymentFormData:
    """Data needed to render the Redsys payment form."""
    payment_url: str
    ds_signature_version: str
    ds_merchant_parameters: str
    ds_signature: str


@dataclass
class RedsysNotificationData:
    """Parsed data from Redsys webhook notification."""
    order_id: str
    authorization_code: Optional[str]
    response_code: str
    amount_cents: int
    currency: str
    transaction_type: str
    merchant_code: str
    terminal: str
    secure_payment: bool
    card_country: Optional[str] = None
    card_brand: Optional[str] = None
    error_code: Optional[str] = None

    @property
    def is_successful(self) -> bool:
        """Check if the transaction was successful."""
        try:
            code = int(self.response_code)
            return 0 <= code <= 99
        except ValueError:
            return False


class RedsysServicePort(ABC):
    """Port for Redsys payment gateway operations."""

    @abstractmethod
    async def create_payment_form_data(
        self,
        request: RedsysPaymentRequest
    ) -> RedsysPaymentFormData:
        """
        Create the form data needed to submit a payment to Redsys.
        Returns the encoded parameters and signature for the form.
        """
        pass

    @abstractmethod
    async def verify_notification_signature(
        self,
        ds_signature: str,
        ds_merchant_parameters: str
    ) -> bool:
        """
        Verify the signature of a Redsys webhook notification.
        Returns True if the signature is valid.
        """
        pass

    @abstractmethod
    async def parse_notification(
        self,
        ds_merchant_parameters: str
    ) -> RedsysNotificationData:
        """
        Parse the merchant parameters from a Redsys notification.
        Returns the decoded notification data.
        """
        pass

    @abstractmethod
    async def process_refund(
        self,
        original_order_id: str,
        refund_amount_cents: int,
        refund_order_id: str
    ) -> RedsysPaymentFormData:
        """
        Create form data for processing a refund.
        """
        pass

    @abstractmethod
    def generate_order_id(self, payment_id: str) -> str:
        """
        Generate a Redsys-compatible order ID from a payment ID.
        Must be 4-12 characters, starting with 4 numeric characters.
        """
        pass

    @abstractmethod
    def get_response_message(self, response_code: str) -> str:
        """
        Get a human-readable message for a Redsys response code.
        """
        pass
