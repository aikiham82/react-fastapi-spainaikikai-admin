"""Initiate Seminar Oficialidad payment use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.domain.exceptions.seminar import SeminarNotFoundError, SeminarAlreadyOfficialError
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.redsys_service import (
    RedsysServicePort,
    RedsysPaymentRequest,
    RedsysPaymentFormData
)


OFICIALIDAD_PRICE_KEY = "oficialidad_seminar"


@dataclass
class InitiateOfficialidadResult:
    """Result of initiating an oficialidad payment."""
    payment_id: str
    order_id: str
    amount: float
    form_data: RedsysPaymentFormData


class InitiateSeminarOfficialidadUseCase:
    """Use case for initiating a Redsys payment to make a seminar official.

    Flow:
    1. Load seminar — raise SeminarNotFoundError if missing
    2. Check is_official — raise SeminarAlreadyOfficialError (HTTP 409) if true
    3. Fetch oficialidad price from PriceConfiguration
    4. Create Payment entity (type=SEMINAR_OFICIALIDAD, related_entity_id=seminar_id)
    5. Generate Redsys form data
    6. Return form data to frontend for redirect
    """

    def __init__(
        self,
        seminar_repository: SeminarRepositoryPort,
        payment_repository: PaymentRepositoryPort,
        price_configuration_repository: PriceConfigurationRepositoryPort,
        redsys_service: RedsysServicePort,
    ):
        self.seminar_repository = seminar_repository
        self.payment_repository = payment_repository
        self.price_configuration_repository = price_configuration_repository
        self.redsys_service = redsys_service

    async def execute(
        self,
        seminar_id: str,
        club_id: str,
        success_url: str,
        failure_url: str,
        webhook_url: str,
    ) -> InitiateOfficialidadResult:
        """Execute the oficialidad payment initiation.

        Args:
            seminar_id: The seminar to make official
            club_id: The club that owns the seminar
            success_url: Frontend URL for Redsys OK redirect
            failure_url: Frontend URL for Redsys KO redirect
            webhook_url: Backend URL for Redsys webhook notification

        Returns:
            InitiateOfficialidadResult with Redsys form data

        Raises:
            SeminarNotFoundError: If seminar does not exist
            SeminarAlreadyOfficialError: If seminar is already official (409)
            ValueError: If oficialidad price is not configured
        """
        # 1. Load seminar
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)

        # 2. Guard: already official → 409
        if seminar.is_official:
            raise SeminarAlreadyOfficialError(seminar_id)

        # 3. Fetch oficialidad price
        price_config = await self.price_configuration_repository.find_by_key(OFICIALIDAD_PRICE_KEY)
        if not price_config or price_config.price <= 0:
            raise ValueError(
                f"Oficialidad price not configured. "
                f"Create a PriceConfiguration with key='{OFICIALIDAD_PRICE_KEY}' and category='seminar'."
            )
        amount = price_config.price

        # 4. Create pending payment
        payment = Payment(
            member_id=None,  # Oficialidad is a club-level payment, not member-level
            club_id=club_id,
            payment_type=PaymentType.SEMINAR_OFICIALIDAD,
            amount=amount,
            status=PaymentStatus.PENDING,
            related_entity_id=seminar_id,
            payment_year=datetime.now().year,
        )
        payment = await self.payment_repository.create(payment)

        # 5. Generate Redsys order ID and mark as processing
        order_id = self.redsys_service.generate_order_id(payment.id)
        payment.mark_as_processing()
        payment.transaction_id = order_id
        await self.payment_repository.update(payment)

        # 6. Create Redsys payment request
        amount_cents = int(amount * 100)
        redsys_request = RedsysPaymentRequest(
            order_id=order_id,
            amount_cents=amount_cents,
            description=f"Oficialidad seminario: {seminar.title}",
            merchant_url=webhook_url,
            ok_url=success_url,
            ko_url=failure_url,
            product_description=f"Oficialidad - {seminar.title}",
        )

        form_data = await self.redsys_service.create_payment_form_data(redsys_request)

        return InitiateOfficialidadResult(
            payment_id=payment.id,
            order_id=order_id,
            amount=amount,
            form_data=form_data,
        )
