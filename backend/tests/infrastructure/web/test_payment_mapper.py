"""What the panel receives for a payment."""

from datetime import datetime

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.infrastructure.web.mappers_payment import PaymentMapper


def test_a_payment_response_says_when_it_was_started_and_who_paid():
    started = datetime(2026, 4, 3, 10, 20)
    payment = Payment(
        id="pay1", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA, amount=90.0,
        status=PaymentStatus.PROCESSING, payment_year=2026, payer_name="Example Payer",
        created_at=started, updated_at=started,
    )

    response = PaymentMapper.to_response_dto(payment)

    assert response.created_at == started
    assert response.updated_at == started
    assert response.payer_name == "Example Payer"
