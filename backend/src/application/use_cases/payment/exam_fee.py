"""What an exam fee charges: the member, the price and the line, shared by the manual and the card payment."""
import json
from dataclasses import dataclass
from datetime import date, datetime

from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.use_cases.payment.refuse_lines_already_paid import refuse_lines_already_paid
from src.domain.entities.member import Member
from src.domain.entities.member_payment import (
    EXAM_PAYMENT_TYPES,
    PAYMENT_TYPE_LABELS,
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError, PaymentAlreadyExistsError


def exam_line_description(exam: str, exam_date: date, venue: str) -> str:
    return f"{PAYMENT_TYPE_LABELS[exam]} · {exam_date:%d/%m/%Y} · {venue}"


FIRST_DAN = (MemberPaymentType.EXAMEN_DAN_1.value, MemberPaymentType.EXAMEN_DAN_1_HOMBU.value)
SAME_EXAM = {exam: FIRST_DAN for exam in FIRST_DAN}


@dataclass(frozen=True)
class ExamCharge:
    member: Member
    exam: MemberPaymentType
    price: float
    description: str


async def exam_charge(
    member_repository: MemberRepositoryPort,
    member_payment_repository: MemberPaymentRepositoryPort,
    price_configuration_repository: PriceConfigurationRepositoryPort,
    member_id: str,
    exam: str,
    exam_date: date,
    venue: str,
) -> ExamCharge:
    if exam not in EXAM_PAYMENT_TYPES:
        raise InvalidPaymentDataError(f"Examen desconocido: {exam}")
    member = await member_repository.find_by_id(member_id)
    if member is None:
        raise InvalidPaymentDataError("Miembro no encontrado")
    try:
        await refuse_lines_already_paid(
            member_payment_repository, [(member_id, same) for same in SAME_EXAM.get(exam, (exam,))], exam_date.year, datetime.utcnow()
        )
    except DuplicatePaymentForYearError:
        raise PaymentAlreadyExistsError(f"{PAYMENT_TYPE_LABELS[exam]} ya está pagado en {exam_date.year}")
    price = await price_configuration_repository.find_by_key(exam)
    if price is None or not price.is_active:
        raise InvalidPaymentDataError(f"Falta el precio de {PAYMENT_TYPE_LABELS[exam]}")
    return ExamCharge(
        member=member,
        exam=MemberPaymentType(exam),
        price=price.price,
        description=exam_line_description(exam, exam_date, venue),
    )


def exam_payment(charge: ExamCharge, exam_date: date, payer_name: str, payment_method: PaymentMethod, status: PaymentStatus) -> Payment:
    return Payment(
        member_id=charge.member.id,
        club_id=charge.member.club_id,
        payment_type=PaymentType.EXAM_FEE,
        payment_method=payment_method,
        amount=charge.price,
        status=status,
        payment_year=exam_date.year,
        payer_name=payer_name,
        line_items_data=json.dumps([{
            "item_type": charge.exam.value,
            "description": charge.description,
            "quantity": 1,
            "unit_price": charge.price,
            "total": charge.price,
        }]),
        member_assignments=json.dumps([{
            "member_id": charge.member.id,
            "member_name": charge.member.get_full_name(),
            "payment_types": [charge.exam.value],
        }]),
    )


def exam_line(payment: Payment) -> MemberPayment:
    [item] = json.loads(payment.line_items_data)
    return MemberPayment(
        payment_id=payment.id,
        member_id=payment.member_id,
        payment_year=payment.payment_year,
        payment_type=MemberPaymentType(item["item_type"]),
        concept=item["description"],
        amount=item["unit_price"],
        status=MemberPaymentStatus.COMPLETED,
    )
