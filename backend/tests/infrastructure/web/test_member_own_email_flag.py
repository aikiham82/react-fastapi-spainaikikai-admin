"""The member list tells which members have an email of their own to activate their card."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member
from src.infrastructure.web.mappers_member import MemberMapper
from src.infrastructure.web.routers.members import _enrich_members_with_own_email

pytestmark = [pytest.mark.unit]


@pytest.mark.asyncio
async def test_only_a_present_unshared_email_counts_as_own():
    members = [
        Member(id="a", first_name="Ana", last_name="Ejemplo", email="ana@example.com", club_id="c"),
        Member(id="b", first_name="Luis", last_name="Ejemplo", email="Familia@example.com", club_id="c"),
        Member(id="c", first_name="Marta", last_name="Ejemplo", email="", club_id="c"),
    ]
    repo = MagicMock()
    repo.count_by_emails = AsyncMock(return_value={"ana@example.com": 1, "familia@example.com": 3})

    responses = await _enrich_members_with_own_email(MemberMapper.to_response_list(members), repo)

    assert [r.has_own_email for r in responses] == [True, False, False]
    repo.count_by_emails.assert_awaited_once()
