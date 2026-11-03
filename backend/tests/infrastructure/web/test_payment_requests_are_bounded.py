"""A payment request repeats no line and has a size, so one call cannot create thousands of lines."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.infrastructure.web.dto.annual_payment_dto import InitiateAnnualPaymentRequest
from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest, PaymentUpdateRequest
from src.infrastructure.web.dto.payment_dto import PaymentRefundRequest

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


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_1000_lines_are_accepted(request_type, fields):
    assignments = [assignment(f"member-{index}", "kyu", "seguro_rc") for index in range(500)]

    assert len(build(request_type, fields, assignments).member_assignments) == 500


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_more_than_1000_lines_are_refused(request_type, fields):
    assignments = [assignment(f"member-{index}", "kyu", "seguro_rc", "seguro_accidentes") for index in range(334)]

    with pytest.raises(ValidationError):
        build(request_type, fields, assignments)


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_too_many_members_stops_before_validating_each_one(request_type, fields):
    assignments = [assignment("") for _ in range(100_000)]

    with pytest.raises(ValidationError) as refused:
        build(request_type, fields, assignments)

    assert refused.value.error_count() <= 500


@pytest.mark.parametrize(
    "amount",
    [0, -1, float("inf"), float("nan"), 1_000_001],
    ids=["zero-would-refund-everything", "negative", "inf", "nan", "over-the-limit"],
)
def test_a_refund_amount_out_of_range_is_refused(amount):
    with pytest.raises(ValidationError):
        PaymentRefundRequest(refund_amount=amount)


@pytest.mark.parametrize("amount", [None, 0.01, 1_000_000], ids=["whole-payment", "smallest", "limit"])
def test_a_refund_amount_within_the_range_is_accepted(amount):
    assert PaymentRefundRequest(refund_amount=amount).refund_amount == amount


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_a_name_of_200_characters_is_accepted(request_type, fields):
    named = assignment("a") | {"member_name": "a" * 200}

    request = request_type(**{**fields, "payer_name": "a" * 200}, member_assignments=[named])

    assert len(request.member_assignments[0].member_name) == 200


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_a_longer_member_name_is_refused(request_type, fields):
    with pytest.raises(ValidationError):
        build(request_type, fields, [assignment("a") | {"member_name": "a" * 201}])


@pytest.mark.parametrize(("request_type", "fields"), REQUESTS, ids=IDS)
def test_a_longer_payer_name_is_refused(request_type, fields):
    with pytest.raises(ValidationError):
        build(request_type, {**fields, "payer_name": "a" * 201}, [assignment("a")])


def test_a_payment_update_refuses_a_longer_payer_name():
    with pytest.raises(ValidationError):
        PaymentUpdateRequest(payer_name="a" * 201)
