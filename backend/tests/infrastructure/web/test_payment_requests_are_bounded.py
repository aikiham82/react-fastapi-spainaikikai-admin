"""A payment request repeats no line and has a size, so one call cannot create thousands of lines."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.infrastructure.web.dto.annual_payment_dto import InitiateAnnualPaymentRequest
from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

pytestmark = [pytest.mark.unit]

COMMON = {"payer_name": "Ana Example", "club_id": "club-dojo", "payment_year": datetime.now().year}
REQUESTS = [
    (ManualPaymentRequest, {**COMMON, "payment_method": "cash"}),
    (InitiateAnnualPaymentRequest, COMMON),
]
IDS = ["manual", "annual"]


def assignment(member_id: str, *payment_types: str) -> dict:
    return {"member_id": member_id, "member_name": "Ana Example", "payment_types": list(payment_types) or ["kyu"]}


def build(request, fields, assignments):
    return request(**fields, member_assignments=assignments)


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_a_normal_payment_is_accepted(request_type, fields):
    assignments = [assignment("a", "kyu", "seguro_rc"), assignment("b", "dan", "seguro_rc")]

    assert len(build(request_type, fields, assignments).member_assignments) == 2


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_a_type_repeated_in_a_member_is_refused(request_type, fields):
    with pytest.raises(ValidationError):
        build(request_type, fields, [assignment("a", "fukushidoin", "fukushidoin")])


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
@pytest.mark.parametrize("repeated", ["a", " a "], ids=["same", "with-spaces"])
def test_a_repeated_member_is_refused(request_type, fields, repeated):
    with pytest.raises(ValidationError):
        build(request_type, fields, [assignment("a", "kyu"), assignment(repeated, "seguro_rc")])


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_500_members_are_accepted(request_type, fields):
    assignments = [assignment(f"member-{index}") for index in range(500)]

    assert len(build(request_type, fields, assignments).member_assignments) == 500


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_more_than_500_members_are_refused(request_type, fields):
    with pytest.raises(ValidationError):
        build(request_type, fields, [assignment(f"member-{index}") for index in range(501)])
