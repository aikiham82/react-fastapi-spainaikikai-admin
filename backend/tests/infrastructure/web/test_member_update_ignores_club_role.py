"""The generic member update must not carry the club role."""

import pytest

from src.infrastructure.web.dto.member_dto import MemberUpdate


@pytest.mark.unit
def test_a_club_role_sent_to_the_member_update_is_dropped():
    """PUT /members/{id} used to pass club_role as a raw string to the entity and answer 500.

    Roles change only through PATCH /members/{id}/club-role, which holds the
    super admin, self and last-admin rules.
    """
    update = MemberUpdate(phone="600000000", club_role="admin")

    assert update.model_dump(exclude_none=True) == {"phone": "600000000"}
