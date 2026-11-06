"""DTOs for paying an exam fee."""

from datetime import date, timedelta
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from src.infrastructure.web.dto.payment_dto import InitiatePaymentResponse, PaymentResponse
from src.infrastructure.web.dto.payment_lines import PersonName

Exam = Literal[
    "examen_dan_1_hombu",
    "examen_dan_1",
    "examen_dan_2",
    "examen_dan_3",
    "examen_dan_4",
    "examen_dan_5",
    "examen_dan_6",
]


class ExamPaymentRequest(BaseModel):
    member_id: str = Field(..., min_length=1, max_length=64)
    exam: Exam
    exam_date: date
    venue: str = Field(..., max_length=200)
    payer_name: PersonName

    @field_validator("exam_date")
    @classmethod
    def exam_date_is_plausible(cls, exam_date: date) -> date:
        today = date.today()
        if not today - timedelta(days=366) <= exam_date <= today + timedelta(days=731):
            raise ValueError("La fecha del examen no es válida")
        return exam_date

    @field_validator("venue")
    @classmethod
    def venue_is_given(cls, venue: str) -> str:
        venue = venue.strip()
        if not venue:
            raise ValueError("Indica el lugar del examen")
        return venue


class ManualExamPaymentRequest(ExamPaymentRequest):
    payment_method: Literal["cash", "transfer", "other"]


class ManualExamPaymentResponse(BaseModel):
    payment: PaymentResponse
    invoice_number: Optional[str] = None


class InitiateExamPaymentResponse(InitiatePaymentResponse):
    redirect_url: str
