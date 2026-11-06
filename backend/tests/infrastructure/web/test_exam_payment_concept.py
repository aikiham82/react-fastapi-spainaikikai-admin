"""A payment list names who an exam payment is for and which exam."""

import json

import pytest

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.infrastructure.web.mappers_payment import PaymentMapper

pytestmark = pytest.mark.unit


def test_an_exam_payment_names_the_member_and_the_exam():
    payment = Payment(
        id="pay1", member_id="m1", club_id="club1", payment_type=PaymentType.EXAM_FEE, amount=175,
        status=PaymentStatus.PROCESSING, payment_year=2026,
        line_items_data=json.dumps([{"item_type": "examen_dan_2", "description": "Examen 2.º Dan · 14/11/2026 · Madrid"}]),
        member_assignments=json.dumps([{"member_id": "m1", "member_name": "Lucía Prueba", "payment_types": ["examen_dan_2"]}]),
    )

    assert PaymentMapper.to_response_dto(payment).concept == "Lucía Prueba · Examen 2.º Dan · 14/11/2026 · Madrid"


def test_an_annual_payment_has_no_concept():
    payment = Payment(id="pay2", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA, amount=20, payment_year=2026)

    assert PaymentMapper.to_response_dto(payment).concept is None
