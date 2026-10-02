"""The club filter never reads "no club" as "no filter"."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException, status

from src.domain.entities.member import ClubRole
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext, get_club_filter_ctx

pytestmark = [pytest.mark.unit, pytest.mark.auth]


def user(global_role=GlobalRole.USER) -> User:
    return User(
        id="user-id",
        email="user@example.com",
        username="user",
        hashed_password="hash",
        global_role=global_role,
    )


def test_a_super_admin_gets_no_filter():
    assert get_club_filter_ctx(AuthContext(user=user(GlobalRole.SUPER_ADMIN))) is None


def test_a_club_admin_is_filtered_to_their_club():
    ctx = AuthContext(user=user(), member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id="club-own"))

    assert get_club_filter_ctx(ctx) == "club-own"


@pytest.mark.parametrize("member", [None, SimpleNamespace(club_role=ClubRole.ADMIN, club_id=None)])
def test_a_caller_with_no_club_is_refused_instead_of_unfiltered(member):
    with pytest.raises(HTTPException) as refused:
        get_club_filter_ctx(AuthContext(user=user(), member=member))

    assert refused.value.status_code == status.HTTP_403_FORBIDDEN
