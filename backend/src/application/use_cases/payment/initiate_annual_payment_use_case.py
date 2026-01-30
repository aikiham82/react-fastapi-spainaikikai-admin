"""Initiate Annual Payment use case."""

import json
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.domain.exceptions.payment import DuplicatePaymentForYearError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.redsys_service import (
    RedsysServicePort,
    RedsysPaymentRequest,
    RedsysPaymentFormData
)
from src.config.annual_payment_prices import ANNUAL_PAYMENT_PRICES, ANNUAL_PAYMENT_LABELS


@dataclass
class AnnualPaymentLineItem:
    """Line item for annual payment."""
    item_type: str
    description: str
    quantity: int
    unit_price: float
    total: float

    def to_dict(self) -> dict:
        return {
            "item_type": self.item_type,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total": self.total
        }


@dataclass
class InitiateAnnualPaymentResult:
    """Result of initiating an annual payment."""
    payment_id: str
    order_id: str
    total_amount: float
    line_items: List[AnnualPaymentLineItem]
    form_data: RedsysPaymentFormData


class InitiateAnnualPaymentUseCase:
    """Use case for initiating annual payment through Redsys."""

    def __init__(
        self,
        payment_repository: PaymentRepositoryPort,
        redsys_service: RedsysServicePort
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service

    async def execute(
        self,
        payer_name: str,
        club_id: str,
        payment_year: int,
        include_club_fee: bool = False,
        kyu_count: int = 0,
        kyu_infantil_count: int = 0,
        dan_count: int = 0,
        fukushidoin_shidoin_count: int = 0,
        seguro_accidentes_count: int = 0,
        seguro_rc_count: int = 0,
        success_url: str = "",
        failure_url: str = "",
        webhook_url: str = ""
    ) -> InitiateAnnualPaymentResult:
        """
        Execute the use case and return Redsys form data for annual payment.

        Args:
            payer_name: Name of the payer
            club_id: Club ID
            payment_year: Year the payment covers
            include_club_fee: Whether to include club annual fee
            kyu_count: Number of KYU licenses
            kyu_infantil_count: Number of KYU infantil licenses
            dan_count: Number of DAN licenses
            fukushidoin_shidoin_count: Number of FUKUSHIDOIN/SHIDOIN licenses
            seguro_accidentes_count: Number of accident insurances
            seguro_rc_count: Number of RC insurances
            success_url: URL to redirect on successful payment
            failure_url: URL to redirect on failed payment
            webhook_url: URL for Redsys to send payment notifications

        Returns:
            InitiateAnnualPaymentResult with payment ID, order ID, line items and form data
        """
        # Validate at least one item is selected
        has_items = (
            include_club_fee or
            kyu_count > 0 or
            kyu_infantil_count > 0 or
            dan_count > 0 or
            fukushidoin_shidoin_count > 0 or
            seguro_accidentes_count > 0 or
            seguro_rc_count > 0
        )
        if not has_items:
            raise ValueError("Al menos un concepto debe ser seleccionado")

        # Check for duplicate payment (same club + year + ANNUAL_QUOTA)
        existing = await self.payment_repository.find_by_club_type_year(
            club_id, PaymentType.ANNUAL_QUOTA, payment_year
        )
        if existing:
            raise DuplicatePaymentForYearError(club_id, "annual_quota", payment_year)

        # Build line items and calculate total
        line_items: List[AnnualPaymentLineItem] = []
        total_amount = 0.0

        if include_club_fee:
            price = ANNUAL_PAYMENT_PRICES["club_fee"]
            line_items.append(AnnualPaymentLineItem(
                item_type="club_fee",
                description=ANNUAL_PAYMENT_LABELS["club_fee"],
                quantity=1,
                unit_price=price,
                total=price
            ))
            total_amount += price

        if kyu_count > 0:
            price = ANNUAL_PAYMENT_PRICES["kyu"]
            line_items.append(AnnualPaymentLineItem(
                item_type="kyu",
                description=ANNUAL_PAYMENT_LABELS["kyu"],
                quantity=kyu_count,
                unit_price=price,
                total=price * kyu_count
            ))
            total_amount += price * kyu_count

        if kyu_infantil_count > 0:
            price = ANNUAL_PAYMENT_PRICES["kyu_infantil"]
            line_items.append(AnnualPaymentLineItem(
                item_type="kyu_infantil",
                description=ANNUAL_PAYMENT_LABELS["kyu_infantil"],
                quantity=kyu_infantil_count,
                unit_price=price,
                total=price * kyu_infantil_count
            ))
            total_amount += price * kyu_infantil_count

        if dan_count > 0:
            price = ANNUAL_PAYMENT_PRICES["dan"]
            line_items.append(AnnualPaymentLineItem(
                item_type="dan",
                description=ANNUAL_PAYMENT_LABELS["dan"],
                quantity=dan_count,
                unit_price=price,
                total=price * dan_count
            ))
            total_amount += price * dan_count

        if fukushidoin_shidoin_count > 0:
            price = ANNUAL_PAYMENT_PRICES["fukushidoin_shidoin"]
            line_items.append(AnnualPaymentLineItem(
                item_type="fukushidoin_shidoin",
                description=ANNUAL_PAYMENT_LABELS["fukushidoin_shidoin"],
                quantity=fukushidoin_shidoin_count,
                unit_price=price,
                total=price * fukushidoin_shidoin_count
            ))
            total_amount += price * fukushidoin_shidoin_count

        if seguro_accidentes_count > 0:
            price = ANNUAL_PAYMENT_PRICES["seguro_accidentes"]
            line_items.append(AnnualPaymentLineItem(
                item_type="seguro_accidentes",
                description=ANNUAL_PAYMENT_LABELS["seguro_accidentes"],
                quantity=seguro_accidentes_count,
                unit_price=price,
                total=price * seguro_accidentes_count
            ))
            total_amount += price * seguro_accidentes_count

        if seguro_rc_count > 0:
            price = ANNUAL_PAYMENT_PRICES["seguro_rc"]
            line_items.append(AnnualPaymentLineItem(
                item_type="seguro_rc",
                description=ANNUAL_PAYMENT_LABELS["seguro_rc"],
                quantity=seguro_rc_count,
                unit_price=price,
                total=price * seguro_rc_count
            ))
            total_amount += price * seguro_rc_count

        # Serialize line items to JSON for storage
        line_items_data = json.dumps([item.to_dict() for item in line_items])

        # Create pending payment
        payment = Payment(
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=total_amount,
            status=PaymentStatus.PENDING,
            payment_year=payment_year,
            payer_name=payer_name,
            line_items_data=line_items_data
        )
        payment = await self.payment_repository.create(payment)

        # Generate Redsys order ID
        order_id = self.redsys_service.generate_order_id(payment.id)

        # Mark as processing and store order ID
        payment.mark_as_processing()
        payment.transaction_id = order_id
        await self.payment_repository.update(payment)

        # Convert amount to cents (Redsys uses cents)
        amount_cents = int(total_amount * 100)

        # Create Redsys payment request
        description = f"Pago anual {payment_year} - {payer_name}"
        redsys_request = RedsysPaymentRequest(
            order_id=order_id,
            amount_cents=amount_cents,
            description=description,
            merchant_url=webhook_url,
            ok_url=success_url,
            ko_url=failure_url,
            product_description=description
        )

        # Generate form data
        form_data = await self.redsys_service.create_payment_form_data(redsys_request)

        return InitiateAnnualPaymentResult(
            payment_id=payment.id,
            order_id=order_id,
            total_amount=total_amount,
            line_items=line_items,
            form_data=form_data
        )
