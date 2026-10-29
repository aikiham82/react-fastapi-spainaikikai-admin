"""Each insurance in the list carries its member's DNI, or none when the member has no DNI."""

from datetime import datetime

import pytest

from src.infrastructure.web.dto.insurance_dto import InsuranceResponse
from src.infrastructure.web.routers import insurances as insurances_router

pytestmark = [pytest.mark.api]

MEMBERS = {
    "member-with-dni": {"_id": "member-with-dni", "first_name": "Ana", "last_name": "Activa", "dni": "12345678Z"},
    "member-without-dni": {"_id": "member-without-dni", "first_name": "Bruno", "last_name": "Baja", "dni": ""},
}


class MembersCollection:
    async def find_one(self, query):
        return MEMBERS.get(query["_id"])


def insurance_of(member_id: str) -> InsuranceResponse:
    return InsuranceResponse(
        id=f"insurance-of-{member_id}",
        member_id=member_id,
        insurance_type="accident",
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=datetime(2025, 10, 1),
        end_date=datetime(2026, 9, 30),
        status="active",
    )


@pytest.mark.asyncio
async def test_member_dni_is_populated_and_none_when_empty(monkeypatch):
    monkeypatch.setattr(insurances_router, "get_database", lambda: {"members": MembersCollection()})

    items = await insurances_router._populate_member_names(
        [insurance_of("member-with-dni"), insurance_of("member-without-dni")]
    )

    assert {item.member_name: item.member_dni for item in items} == {"Ana Activa": "12345678Z", "Bruno Baja": None}
