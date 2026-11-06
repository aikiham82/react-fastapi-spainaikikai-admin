"""Register an exam fee paid outside the platform (transfer, cash, other)."""
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.pdf_service import PDFServicePort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.use_cases.invoice.create_payment_invoice import create_payment_invoice
from src.domain.entities.invoice import Invoice
from src.domain.entities.member import Member
from src.domain.entities.member_payment import (
    EXAM_PAYMENT_TYPES,
    PAYMENT_TYPE_LABELS,
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.application.use_cases.payment.refuse_lines_already_paid import refuse_lines_already_paid
from src.domain.exceptions.payment import DuplicatePaymentForYearError, InvalidPaymentDataError, PaymentAlreadyExistsError

logger = logging.getLogger(__name__)

EXAMS = frozenset(line_type.value for line_type in EXAM_PAYMENT_TYPES)
MANUAL_METHODS = frozenset({PaymentMethod.CASH.value, PaymentMethod.TRANSFER.value, PaymentMethod.OTHER.value})


def exam_line_description(exam: str, exam_date: date, venue: str) -> str:
    return f"{PAYMENT_TYPE_LABELS[exam]} · {exam_date:%d/%m/%Y} · {venue}"


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
    if exam not in EXAMS:
        raise InvalidPaymentDataError(f"Examen desconocido: {exam}")
    member = await member_repository.find_by_id(member_id)
    if member is None:
        raise InvalidPaymentDataError("Miembro no encontrado")
    try:
        await refuse_lines_already_paid(member_payment_repository, [(member_id, exam)], exam_date.year, datetime.utcnow())
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


@dataclass
class RegisterManualExamPaymentResult:
    payment: Payment
    member_payment: Optional[MemberPayment]
    invoice: Optional[Invoice]


class RegisterManualExamPaymentUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        member_payment_repository: MemberPaymentRepositoryPort,
        invoice_repository: InvoiceRepositoryPort,
        member_repository: MemberRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        pdf_service: Optional[PDFServicePort] = None,
        club_repository: Optional[ClubRepositoryPort] = None,
    ):
        self.payment_repository = payment_repository
        self.member_payment_repository = member_payment_repository
        self.invoice_repository = invoice_repository
        self.member_repository = member_repository
        self.price_configuration_repository = price_configuration_repository
        self.pdf_service = pdf_service
        self.club_repository = club_repository

    async def execute(
        self,
        member_id: str,
        exam: str,
        exam_date: date,
        venue: str,
        payer_name: str,
        payment_method: str,
    ) -> RegisterManualExamPaymentResult:
        if payment_method not in MANUAL_METHODS:
            raise InvalidPaymentDataError("Un pago manual es en efectivo, por transferencia u otro")
        charge = await exam_charge(
            self.member_repository, self.member_payment_repository, self.price_configuration_repository,
            member_id, exam, exam_date, venue,
        )
        payment = exam_payment(charge, exam_date, payer_name, PaymentMethod(payment_method), PaymentStatus.COMPLETED)
        payment.payment_date = datetime.utcnow()
        payment = await self.payment_repository.create(payment)

        lines = await self.member_payment_repository.create_bulk([exam_line(payment)])
        if not lines:
            logger.error("Exam payment %s saved without its member line", payment.id)

        invoice = None
        try:
            invoice = await create_payment_invoice(
                payment, self.invoice_repository, self.member_repository, self.club_repository, self.pdf_service
            )
        except Exception:
            logger.exception("Failed to create invoice for exam payment %s", payment.id)

        return RegisterManualExamPaymentResult(payment=payment, member_payment=lines[0] if lines else None, invoice=invoice)
