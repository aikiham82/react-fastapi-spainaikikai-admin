"""Payment created by InitiateSeminarOfficialidadUseCase carries what its invoice needs."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.domain.entities.club import Club
from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.entities.seminar import Seminar
from src.application.use_cases.seminar.initiate_seminar_oficialidad_use_case import (
    InitiateSeminarOfficialidadUseCase,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_oficialidad_payment_names_the_club_and_the_seminar():
    seminar = MagicMock(spec=Seminar, title="Example Seminar", is_official=False)
    seminar_repository = MagicMock(find_by_id=AsyncMock(return_value=seminar))
    club = MagicMock(spec=Club)
    club.name = "Example Dojo"
    club_repository = MagicMock(find_by_id=AsyncMock(return_value=club))
    price_configuration_repository = MagicMock(
        find_by_key=AsyncMock(return_value=MagicMock(spec=PriceConfiguration, price=20.0))
    )
    payment_repository = MagicMock(
        create=AsyncMock(side_effect=lambda payment: payment),
        update=AsyncMock(),
    )
    redsys_service = MagicMock(
        generate_order_id=MagicMock(return_value="order1"),
        create_payment_form_data=AsyncMock(),
    )
    use_case = InitiateSeminarOfficialidadUseCase(
        seminar_repository=seminar_repository,
        club_repository=club_repository,
        payment_repository=payment_repository,
        price_configuration_repository=price_configuration_repository,
        redsys_service=redsys_service,
    )

    await use_case.execute(
        seminar_id="seminar1",
        club_id="club1",
        success_url="https://example.com/ok",
        failure_url="https://example.com/ko",
        webhook_url="https://example.com/webhook",
    )

    payment = payment_repository.create.call_args.args[0]
    assert payment.payer_name == "Example Dojo"
    assert json.loads(payment.line_items_data) == [
        {"description": "Oficialidad seminario: Example Seminar", "quantity": 1, "unit_price": 20.0},
    ]
