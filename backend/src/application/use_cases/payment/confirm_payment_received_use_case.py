"""A super admin confirms that an unfinished payment was received another way."""

import json
from datetime import datetime

from src.domain.entities.insurance import insurance_season_year
from src.domain.entities.member_payment import INSURANCE_PAYMENT_TYPES, ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import (
    DuplicatePaymentForYearError,
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

UNFINISHED_STATUSES = (PaymentStatus.PENDING, PaymentStatus.PROCESSING)
OFFLINE_METHODS = (PaymentMethod.TRANSFER, PaymentMethod.CASH, PaymentMethod.OTHER)


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
        await self._refuse_what_is_already_paid(payment)
        if not await self.payment_repository.claim_unfinished(payment_id):
            raise InvalidPaymentStatusError("Este pago ya se ha completado")

        payment.confirm_received(method)
        return await self.complete_payment_use_case.execute(payment)

    async def _refuse_what_is_already_paid(self, payment: Payment) -> None:
        try:
            assignments = json.loads(payment.member_assignments or "[]")
        except (json.JSONDecodeError, TypeError):
            return
        now = datetime.utcnow()
        for assignment in assignments:
            for item_type in assignment.get("payment_types", []):
                line_type = ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE.get(item_type)
                if not line_type:
                    continue
                year = insurance_season_year(now) if line_type in INSURANCE_PAYMENT_TYPES else payment.payment_year
                if await self.member_payment_repository.exists_for_member_year_type(
                    member_id=assignment.get("member_id"), payment_year=year, payment_type=line_type,
                ):
                    raise DuplicatePaymentForYearError(assignment.get("member_id"), item_type, year)
