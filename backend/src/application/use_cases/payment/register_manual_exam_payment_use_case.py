"""Register an exam fee paid outside the platform (transfer, cash, other)."""
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
from src.application.use_cases.payment.exam_fee import exam_charge, exam_line, exam_payment
from src.domain.entities.invoice import Invoice
from src.domain.entities.member_payment import MemberPayment
from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus
from src.domain.exceptions.payment import InvalidPaymentDataError

logger = logging.getLogger(__name__)

MANUAL_METHODS = frozenset({PaymentMethod.CASH.value, PaymentMethod.TRANSFER.value, PaymentMethod.OTHER.value})


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
