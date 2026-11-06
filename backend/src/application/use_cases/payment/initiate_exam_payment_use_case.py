"""Start a card (Redsys) payment for one exam fee."""
import json
from dataclasses import dataclass
from datetime import date, datetime
from typing import Callable

from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.redsys_service import RedsysPaymentFormData, RedsysPaymentRequest, RedsysServicePort
from src.application.use_cases.payment.initiate_annual_payment_use_case import IN_FLIGHT_MINUTES, IN_FLIGHT_WINDOW
from src.application.use_cases.payment.exam_fee import exam_charge, exam_payment
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import PaymentAlreadyExistsError


@dataclass
class InitiateExamPaymentResult:
    payment_id: str
    order_id: str
    form_data: RedsysPaymentFormData


def _exams_of(payment: Payment) -> set:
    return {line.get("item_type") for line in json.loads(payment.line_items_data or "[]")}


class InitiateExamPaymentUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        member_repository: MemberRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        redsys_service: RedsysServicePort,
        clock: Callable[[], datetime] = datetime.utcnow,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.member_repository = member_repository
        self.price_configuration_repository = price_configuration_repository
        self.redsys_service = redsys_service
        self._clock = clock

    async def execute(
        self,
        member_id: str,
        exam: str,
        exam_date: date,
        venue: str,
        payer_name: str,
        success_url: str,
        failure_url: str,
        webhook_url: str,
    ) -> InitiateExamPaymentResult:
        charge = await exam_charge(
            self.member_repository, self.member_payment_repository, self.price_configuration_repository,
            member_id, exam, exam_date, venue,
        )
        in_flight = await self.payment_repository.find_unfinished_exams(member_id, self._clock() - IN_FLIGHT_WINDOW)
        if any(exam in _exams_of(payment) for payment in in_flight):
            raise PaymentAlreadyExistsError(
                "Ya hay un pago con tarjeta en curso para este examen. "
                f"Si lo has dejado a medias, inténtalo de nuevo en {IN_FLIGHT_MINUTES} minutos."
            )

        payment = await self.payment_repository.create(
            exam_payment(charge, exam_date, payer_name, PaymentMethod.REDSYS, PaymentStatus.PENDING)
        )
        order_id = self.redsys_service.generate_order_id(payment.id)
        payment.mark_as_processing()
        payment.transaction_id = order_id
        await self.payment_repository.update(payment)

        form_data = await self.redsys_service.create_payment_form_data(RedsysPaymentRequest(
            order_id=order_id,
            amount_cents=round(charge.price * 100),
            description=charge.description,
            merchant_url=webhook_url,
            ok_url=success_url,
            ko_url=failure_url,
            product_description=charge.description,
        ))
        return InitiateExamPaymentResult(payment_id=payment.id, order_id=order_id, form_data=form_data)
