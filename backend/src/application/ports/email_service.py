"""Service port interfaces for Email operations."""

from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class EmailAttachment:
    """Email attachment data."""
    filename: str
    content: bytes
    content_type: str = "application/octet-stream"


@dataclass
class EmailMessage:
    """Email message data."""
    to: List[str]
    subject: str
    body_html: str
    body_text: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[EmailAttachment]] = None
    reply_to: Optional[str] = None


class EmailServicePort(ABC):
    """Port for email service operations."""

    @abstractmethod
    async def send_email(self, message: EmailMessage) -> bool:
        """Send an email message."""
        pass

    @abstractmethod
    async def send_payment_confirmation(
        self,
        to_email: str,
        member_name: str,
        payment_amount: float,
        license_type: str,
        invoice_pdf: Optional[bytes] = None
    ) -> bool:
        """Send payment confirmation email with optional invoice attachment."""
        pass

    @abstractmethod
    async def send_license_expiration_reminder(
        self,
        to_email: str,
        member_name: str,
        license_number: str,
        expiration_date: str,
        days_remaining: int,
        renewal_url: str
    ) -> bool:
        """Send license expiration reminder email."""
        pass

    @abstractmethod
    async def send_payment_failed_notification(
        self,
        to_email: str,
        member_name: str,
        error_message: str,
        retry_url: str
    ) -> bool:
        """Send payment failed notification email."""
        pass

    @abstractmethod
    async def send_invoice(
        self,
        to_email: str,
        member_name: str,
        invoice_number: str,
        invoice_pdf: bytes
    ) -> bool:
        """Send invoice email with PDF attachment."""
        pass

    @abstractmethod
    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_url: str
    ) -> bool:
        """Send password reset email with reset link.

        Args:
            to_email: Recipient email address.
            user_name: Name of the user requesting reset.
            reset_url: URL with token for password reset.

        Returns:
            bool: True if email was sent successfully.
        """
        pass
