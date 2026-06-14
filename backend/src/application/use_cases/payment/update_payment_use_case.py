"""Update Payment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentMethod
from src.domain.exceptions.payment import (
    PaymentNotFoundError,
    InvalidPaymentStatusError,
    InvalidPaymentDataError,
)
from src.application.ports.payment_repository import PaymentRepositoryPort


class UpdatePaymentUseCase:
    """Use case for updating a manual payment. Redsys COMPLETED payments are read-only."""

    def __init__(self, payment_repository: PaymentRepositoryPort):
        self.payment_repository = payment_repository

    async def execute(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        payment_year: Optional[int] = None,
        payment_method: Optional[str] = None,
        payer_name: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Payment:
        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)

        # Guard: Redsys COMPLETED is read-only
        if (
            payment.payment_method == PaymentMethod.REDSYS
            and payment.status == PaymentStatus.COMPLETED
        ):
            raise InvalidPaymentStatusError(
                "Los pagos completados por Redsys no son editables"
            )

        if amount is not None:
            if amount < 0:
                raise InvalidPaymentDataError("El importe no puede ser negativo")
            payment.amount = amount

        if payment_year is not None:
            if payment_year < 1900 or payment_year > 2100:
                raise InvalidPaymentDataError("Año de pago fuera de rango")
            payment.payment_year = payment_year

        if payment_method is not None:
            try:
                payment.payment_method = PaymentMethod(payment_method)
            except ValueError:
                raise InvalidPaymentDataError(f"Método de pago inválido: {payment_method}")

        if payer_name is not None:
            payment.payer_name = payer_name

        if status is not None:
            try:
                payment.status = PaymentStatus(status)
            except ValueError:
                raise InvalidPaymentDataError(f"Estado de pago inválido: {status}")

        payment.updated_at = datetime.utcnow()
        return await self.payment_repository.update(payment)
