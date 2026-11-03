"""What every payment request must respect: no repeated line, and a size."""

from typing import List, Protocol

MAX_MEMBERS_PER_PAYMENT = 500


class HasMemberId(Protocol):
    member_id: str


def refuse_repeated_types(payment_types: List[str]) -> List[str]:
    if len(set(payment_types)) != len(payment_types):
        raise ValueError("A member cannot have the same payment type twice")
    return payment_types


def refuse_repeated_or_too_many_members(assignments: List[HasMemberId]) -> List[HasMemberId]:
    if len(assignments) > MAX_MEMBERS_PER_PAYMENT:
        raise ValueError(f"A payment cannot have more than {MAX_MEMBERS_PER_PAYMENT} members")
    if len({assignment.member_id for assignment in assignments}) != len(assignments):
        raise ValueError("A member cannot appear twice in a payment")
    return assignments
