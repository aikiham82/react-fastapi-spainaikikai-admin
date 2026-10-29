"""A super admin confirms that an unfinished payment was received another way."""

import json
from datetime import datetime

from src.domain.entities.payment import UNFINISHED_PAYMENT_STATUSES, PaymentMethod
from src.domain.exceptions.payment import (
    InvalidPaymentDataError,
    InvalidPaymentStatusError,
    PaymentNotFoundError,
)
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.use_cases.payment.complete_payment_use_case import (
    CompletedPayment,
    CompletePaymentUseCase,
)
from src.application.use_cases.payment.refuse_lines_already_paid import refuse_lines_already_paid

OFFLINE_METHODS = {PaymentMethod.TRANSFER.value, PaymentMethod.CASH.value, PaymentMethod.OTHER.value}


class ConfirmPaymentReceivedUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        complete_payment_use_case: CompletePaymentUseCase,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.complete_payment_use_case = complete_payment_use_case

    async def execute(self, payment_id: str, payment_method: str) -> CompletedPayment:
        if payment_method not in OFFLINE_METHODS:
            raise InvalidPaymentDataError(f"Método de pago inválido: {payment_method}")

        payment = await self.payment_repository.find_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(payment_id)
        if payment.status not in UNFINISHED_PAYMENT_STATUSES:
            raise InvalidPaymentStatusError("Solo se puede confirmar un pago sin terminar")
        await refuse_lines_already_paid(
            self.member_payment_repository,
            [
                (assignment.get("member_id"), item_type)
                for assignment in json.loads(payment.member_assignments or "[]")
                for item_type in assignment.get("payment_types", [])
            ],
            payment.payment_year,
            datetime.utcnow(),
        )

        payment.confirm_received(PaymentMethod(payment_method))
        return await self.complete_payment_use_case.execute(payment)
