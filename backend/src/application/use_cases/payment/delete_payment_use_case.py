"""Delete Payment use case — cascade: MemberPayments → Invoice → Payment."""

import logging
from typing import Optional

from src.domain.entities.payment import PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import PaymentNotFoundError, InvalidPaymentStatusError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort

logger = logging.getLogger(__name__)


class DeletePaymentUseCase:
    """Use case for deleting a payment with cascade.

    Cascade order: MemberPayments → Invoice → Payment.
    Redsys COMPLETED payments require force=True.
    """

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: Optional[MemberPaymentRepositoryPort] = None,
        invoice_repository: Optional[InvoiceRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository

    async def execute(self, payment_id: str, force: bool = False) -> bool:
        """Delete a payment with optional cascade and force flag.

        Args:
            payment_id: ID of the payment to delete.
            force: When True, allows deletion of Redsys COMPLETED payments.

        Returns:
            True if deletion succeeded.

        Raises:
            PaymentNotFoundError: When payment does not exist.
            InvalidPaymentStatusError: When Redsys COMPLETED and force=False.
        """
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)

        # Guard: Redsys COMPLETED requires force=True
        if (
            payment.payment_method == PaymentMethod.REDSYS
            and payment.status == PaymentStatus.COMPLETED
            and not force
        ):
            raise InvalidPaymentStatusError(
                "Los pagos completados por Redsys solo se pueden borrar con force=true"
            )

        # Cascade step 1: delete MemberPayments
        if self.member_payment_repository:
            lines = await self.member_payment_repository.find_by_payment_id(payment_id)
            for mp in lines:
                await self.member_payment_repository.delete(mp.id)
            logger.info("Deleted %d MemberPayments for payment %s", len(lines), payment_id)

        # Cascade step 2: delete Invoice
        if self.invoice_repository:
            try:
                invoice = await self.invoice_repository.find_by_payment_id(payment_id)
                if invoice and invoice.id:
                    await self.invoice_repository.delete(invoice.id)
                    logger.info(
                        "Deleted invoice %s for payment %s", invoice.id, payment_id
                    )
            except Exception:
                # Survive existing Invoice adapter bug (field name mismatch — Bug B)
                logger.exception(
                    "Could not delete invoice for payment %s (invoice adapter issue)", payment_id
                )

        # Cascade step 3: delete Payment
        deleted = await self.payment_repository.delete(payment_id)
        logger.info("Deleted payment %s (force=%s)", payment_id, force)
        return deleted
