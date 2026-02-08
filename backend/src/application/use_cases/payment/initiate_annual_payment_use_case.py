"""Initiate Annual Payment use case."""

import json
from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.domain.exceptions.payment import DuplicatePaymentForYearError
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.application.ports.redsys_service import (
    RedsysServicePort,
    RedsysPaymentRequest,
    RedsysPaymentFormData
)

# Maps annual payment item_type to price_configuration key
PAYMENT_TYPE_TO_PRICE_KEY = {
    "club_fee": "club_fee",
    "kyu": "kyu-none-adulto",
    "kyu_infantil": "kyu-none-infantil",
    "dan": "dan-none-adulto",
    "fukushidoin": "dan-fukushidoin-adulto",
    "shidoin": "dan-shidoin-adulto",
    "seguro_accidentes": "seguro_accidentes",
    "seguro_rc": "seguro_rc",
}


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
class MemberAssignment:
    """Assignment of payment types to a specific member."""
    member_id: str
    member_name: str
    payment_types: List[str]

    def to_dict(self) -> dict:
        return {
            "member_id": self.member_id,
            "member_name": self.member_name,
            "payment_types": self.payment_types
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
        redsys_service: RedsysServicePort,
        price_repository: PriceConfigurationRepositoryPort,
    ):
        self.payment_repository = payment_repository
        self.redsys_service = redsys_service
        self.price_repository = price_repository

    async def _get_prices(self) -> Dict[str, float]:
        """Fetch all annual payment prices from database.

        Returns:
            Dict mapping item_type -> price.

        Raises:
            ValueError: If any required prices are missing.
        """
        price_keys = list(PAYMENT_TYPE_TO_PRICE_KEY.values())
        configs = await self.price_repository.find_by_keys(price_keys)
        key_to_config = {c.key: c for c in configs}

        missing = [k for k in price_keys if k not in key_to_config]
        if missing:
            raise ValueError(
                f"Faltan configuraciones de precios: {', '.join(missing)}"
            )

        # Map back to item_type -> price
        return {
            item_type: key_to_config[price_key].price
            for item_type, price_key in PAYMENT_TYPE_TO_PRICE_KEY.items()
        }

    async def _get_descriptions(self) -> Dict[str, str]:
        """Fetch descriptions from price configurations."""
        price_keys = list(PAYMENT_TYPE_TO_PRICE_KEY.values())
        configs = await self.price_repository.find_by_keys(price_keys)
        key_to_config = {c.key: c for c in configs}

        return {
            item_type: key_to_config[price_key].description
            for item_type, price_key in PAYMENT_TYPE_TO_PRICE_KEY.items()
            if price_key in key_to_config
        }

    async def execute(
        self,
        payer_name: str,
        club_id: str,
        payment_year: int,
        include_club_fee: bool = False,
        kyu_count: int = 0,
        kyu_infantil_count: int = 0,
        dan_count: int = 0,
        fukushidoin_count: int = 0,
        shidoin_count: int = 0,
        seguro_accidentes_count: int = 0,
        seguro_rc_count: int = 0,
        success_url: str = "",
        failure_url: str = "",
        webhook_url: str = "",
        member_assignments: Optional[List[MemberAssignment]] = None
    ) -> InitiateAnnualPaymentResult:
        """Execute the use case and return Redsys form data for annual payment."""
        # Validate at least one item is selected
        has_items = (
            include_club_fee or
            kyu_count > 0 or
            kyu_infantil_count > 0 or
            dan_count > 0 or
            fukushidoin_count > 0 or
            shidoin_count > 0 or
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

        # Fetch prices from database
        prices = await self._get_prices()
        descriptions = await self._get_descriptions()

        # Build line items and calculate total
        line_items: List[AnnualPaymentLineItem] = []
        total_amount = 0.0

        items_config = [
            ("club_fee", 1 if include_club_fee else 0),
            ("kyu", kyu_count),
            ("kyu_infantil", kyu_infantil_count),
            ("dan", dan_count),
            ("fukushidoin", fukushidoin_count),
            ("shidoin", shidoin_count),
            ("seguro_accidentes", seguro_accidentes_count),
            ("seguro_rc", seguro_rc_count),
        ]

        for item_type, quantity in items_config:
            if quantity > 0:
                price = prices[item_type]
                description = descriptions.get(item_type, item_type)
                line_items.append(AnnualPaymentLineItem(
                    item_type=item_type,
                    description=description,
                    quantity=quantity,
                    unit_price=price,
                    total=price * quantity
                ))
                total_amount += price * quantity

        # Serialize line items to JSON for storage
        line_items_data = json.dumps([item.to_dict() for item in line_items])

        # Validate and serialize member assignments if provided
        member_assignments_data = None
        if member_assignments:
            # Validate that assignments match quantities
            self._validate_member_assignments(
                member_assignments,
                kyu_count,
                kyu_infantil_count,
                dan_count,
                fukushidoin_count,
                shidoin_count,
                seguro_accidentes_count,
                seguro_rc_count
            )
            member_assignments_data = json.dumps(
                [a.to_dict() for a in member_assignments]
            )

        # Create pending payment
        payment = Payment(
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=total_amount,
            status=PaymentStatus.PENDING,
            payment_year=payment_year,
            payer_name=payer_name,
            line_items_data=line_items_data,
            member_assignments=member_assignments_data
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

    def _validate_member_assignments(
        self,
        assignments: List[MemberAssignment],
        kyu_count: int,
        kyu_infantil_count: int,
        dan_count: int,
        fukushidoin_count: int,
        shidoin_count: int,
        seguro_accidentes_count: int,
        seguro_rc_count: int
    ) -> None:
        """Validate that member assignments match the quantities specified."""
        type_counts: Dict[str, int] = {
            "kyu": 0,
            "kyu_infantil": 0,
            "dan": 0,
            "fukushidoin": 0,
            "shidoin": 0,
            "seguro_accidentes": 0,
            "seguro_rc": 0
        }

        for assignment in assignments:
            for ptype in assignment.payment_types:
                if ptype in type_counts:
                    type_counts[ptype] += 1

        expected_counts = {
            "kyu": kyu_count,
            "kyu_infantil": kyu_infantil_count,
            "dan": dan_count,
            "fukushidoin": fukushidoin_count,
            "shidoin": shidoin_count,
            "seguro_accidentes": seguro_accidentes_count,
            "seguro_rc": seguro_rc_count
        }

        for ptype, count in type_counts.items():
            expected = expected_counts[ptype]
            if count > expected:
                raise ValueError(
                    f"Demasiados miembros asignados para {ptype}: "
                    f"{count} asignados, {expected} esperados"
                )
