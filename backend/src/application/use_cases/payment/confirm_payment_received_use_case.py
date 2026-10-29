"""A super admin confirms that an unfinished payment was received another way."""

from datetime import datetime

from src.domain.entities.payment import PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import (
    InvalidPaymentDataError,
    InvalidPaymentStatusError,
    PaymentNotFoundError,
)
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.use_cases.payment.complete_payment_use_case import (
    CompletedPayment,
    CompletePaymentUseCase,
)

UNFINISHED_STATUSES = (PaymentStatus.PENDING, PaymentStatus.PROCESSING)
OFFLINE_METHODS = (PaymentMethod.TRANSFER, PaymentMethod.CASH, PaymentMethod.OTHER)


class ConfirmPaymentReceivedUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        complete_payment_use_case: CompletePaymentUseCase,
    ):
        self.payment_repository = payment_repository
        self.complete_payment_use_case = complete_payment_use_case

    async def execute(self, payment_id: str, payment_method: str) -> CompletedPayment:
        try:
            method = PaymentMethod(payment_method)
        except ValueError:
            method = None
        if method not in OFFLINE_METHODS:
            raise InvalidPaymentDataError(f"Método de pago inválido: {payment_method}")

        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)
        if payment.status not in UNFINISHED_STATUSES:
            raise InvalidPaymentStatusError("Solo se puede confirmar un pago sin terminar")

        payment.payment_method = method
        payment.status = PaymentStatus.COMPLETED
        payment.payment_date = datetime.utcnow()
        return await self.complete_payment_use_case.execute(payment)
