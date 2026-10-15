"""API tests for reading and changing a member's registration date."""

from datetime import datetime, timedelta

import pytest
from fastapi import status

from tests.api.test_members_authorization import (  # noqa: F401
    OTHER_CLUB,
    club_admin,
    client_as,
    use_cases,
)

pytestmark = [pytest.mark.api]


def test_a_club_admin_changes_the_registration_date_of_a_member_of_their_club(client_as, use_cases):
    response = client_as(club_admin()).put(
        "/api/v1/members/member-id", json={"registration_date": "2024-09-01"}
    )

    assert response.status_code == status.HTTP_200_OK
    use_cases.update.execute.assert_called_once_with("member-id", registration_date=datetime(2024, 9, 1))


def test_an_aware_registration_date_is_stored_naive(client_as, use_cases):
    client_as(club_admin()).put(
        "/api/v1/members/member-id", json={"registration_date": "2024-09-01T10:00:00+02:00"}
    )

    use_cases.update.execute.assert_called_once_with("member-id", registration_date=datetime(2024, 9, 1, 8, 0))


def test_a_future_registration_date_is_rejected(client_as, use_cases):
    tomorrow = (datetime.utcnow() + timedelta(days=1)).date().isoformat()

    response = client_as(club_admin()).put("/api/v1/members/member-id", json={"registration_date": tomorrow})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    use_cases.update.execute.assert_not_called()


def test_a_club_admin_cannot_change_a_member_of_another_club(client_as, use_cases):
    response = client_as(club_admin(), stored_club=OTHER_CLUB).put(
        "/api/v1/members/member-id", json={"registration_date": "2024-09-01"}
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    use_cases.update.execute.assert_not_called()


def test_a_new_member_is_created_with_the_given_registration_date(client_as, use_cases):
    response = client_as(club_admin()).post(
        "/api/v1/members", json={"first_name": "Ana", "registration_date": "2018-03-05"}
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert use_cases.create.execute.call_args.kwargs["registration_date"] == datetime(2018, 3, 5)


def test_a_new_member_with_a_future_registration_date_is_rejected(client_as, use_cases):
    tomorrow = (datetime.utcnow() + timedelta(days=1)).date().isoformat()

    response = client_as(club_admin()).post(
        "/api/v1/members", json={"first_name": "Ana", "registration_date": tomorrow}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    use_cases.create.execute.assert_not_called()
