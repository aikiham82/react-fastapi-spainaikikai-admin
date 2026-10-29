"""Who an invoice is addressed to."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.application.use_cases.invoice.invoice_customer import build_invoice_customer
from src.domain.entities.club import Club
from src.domain.entities.member import Member
from src.domain.entities.payment import Payment, PaymentType


def repository_returning(entity):
    repository = MagicMock()
    repository.find_by_id = AsyncMock(return_value=entity)
    return repository


def club_payment(**overrides):
    return Payment(
        id="pay1", club_id="club1", payment_type=PaymentType.ANNUAL_QUOTA,
        amount=60.0, payer_name="Example Payer", **overrides,
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_club_payment_is_addressed_to_the_club():
    club = Club(
        id="club1", name="Example Dojo", address="Calle Mayor 1", postal_code="28001",
        city="Madrid", province="Madrid", email="dojo@example.com", phone="600000000",
    )

    customer = await build_invoice_customer(
        club_payment(), repository_returning(None), repository_returning(club)
    )

    assert customer.name == "Example Dojo"
    assert customer.address == "Calle Mayor 1, 28001 Madrid (Madrid)"
    assert customer.email == "dojo@example.com"
    assert customer.phone == "600000000"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_club_without_city_or_phone_leaves_them_out():
    club = Club(id="club1", name="Example Dojo", address="Calle Mayor 1", email="dojo@example.com")

    customer = await build_invoice_customer(
        club_payment(), repository_returning(None), repository_returning(club)
    )

    assert customer.address == "Calle Mayor 1"
    assert customer.phone == ""


@pytest.mark.unit
@pytest.mark.asyncio
async def test_a_member_payment_is_addressed_to_the_member():
    member = Member(
        id="m1", first_name="Ana", last_name="Example", email="ana@example.com",
        phone="611111111", address="Calle Sol 2", postal_code="41001", city="Sevilla",
    )

    customer = await build_invoice_customer(
        club_payment(member_id="m1"), repository_returning(member), repository_returning(None)
    )

    assert customer.name == "Ana Example"
    assert customer.address == "Calle Sol 2, 41001 Sevilla"
    assert customer.email == "ana@example.com"
    assert customer.phone == "611111111"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_an_unknown_club_falls_back_to_the_payer_name():
    customer = await build_invoice_customer(
        club_payment(), repository_returning(None), repository_returning(None)
    )

    assert customer.name == "Example Payer"
    assert customer.address == ""
