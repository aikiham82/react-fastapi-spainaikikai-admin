"""The two rules that hold a club admin to their own club."""

import pytest
from fastapi import HTTPException, status

from src.infrastructure.web.authorization import require_club_access, require_member_access
from tests.api.callers import (
    FOREIGN_MEMBER,
    OTHER_CLUB,
    OWN_CLUB,
    OWN_MEMBER,
    MembersByClub,
    club_admin,
    plain_member,
    super_admin,
)

pytestmark = [pytest.mark.unit, pytest.mark.auth]


def refused(call) -> bool:
    try:
        call()
    except HTTPException as error:
        return error.status_code == status.HTTP_403_FORBIDDEN
    return False


async def refused_async(awaitable) -> bool:
    try:
        await awaitable
    except HTTPException as error:
        return error.status_code == status.HTTP_403_FORBIDDEN
    return False


@pytest.mark.parametrize("club_id", [OWN_CLUB, OTHER_CLUB, None])
def test_a_super_admin_reaches_any_club(club_id):
    assert not refused(lambda: require_club_access(super_admin(), club_id))


def test_a_club_admin_reaches_their_own_club():
    assert not refused(lambda: require_club_access(club_admin(), OWN_CLUB))


@pytest.mark.parametrize("club_id", [OTHER_CLUB, None, ""])
def test_a_club_admin_is_refused_any_other_club(club_id):
    assert refused(lambda: require_club_access(club_admin(), club_id))


def test_a_club_admin_with_no_club_is_refused_a_record_with_no_club():
    assert refused(lambda: require_club_access(club_admin(club_id=None), None))


def test_a_plain_member_is_refused_their_own_club():
    assert refused(lambda: require_club_access(plain_member(), OWN_CLUB))


async def test_a_club_admin_reaches_a_member_of_their_club():
    assert not await refused_async(require_member_access(club_admin(), OWN_MEMBER, MembersByClub()))


@pytest.mark.parametrize("member_id", [FOREIGN_MEMBER, "member-unknown", None])
async def test_a_club_admin_is_refused_a_member_outside_their_club(member_id):
    assert await refused_async(require_member_access(club_admin(), member_id, MembersByClub()))


async def test_a_super_admin_reaches_any_member():
    assert not await refused_async(require_member_access(super_admin(), FOREIGN_MEMBER, MembersByClub()))
