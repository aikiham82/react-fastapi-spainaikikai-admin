"""What every payment request must respect: no repeated line, and a size."""

from typing import List, Protocol

MAX_MEMBERS_PER_PAYMENT = 500
MAX_LINES_PER_PAYMENT = 1000


class PaymentAssignment(Protocol):
    member_id: str
    payment_types: List[str]


def refuse_repeated_types(payment_types: List[str]) -> List[str]:
    if len(set(payment_types)) != len(payment_types):
        raise ValueError("A member cannot have the same payment type twice")
    return payment_types


def refuse_repeated_members_or_too_many_lines(assignments: List[PaymentAssignment]) -> List[PaymentAssignment]:
    if len({assignment.member_id for assignment in assignments}) != len(assignments):
        raise ValueError("A member cannot appear twice in a payment")
    if sum(len(assignment.payment_types) for assignment in assignments) > MAX_LINES_PER_PAYMENT:
        raise ValueError(f"A payment cannot have more than {MAX_LINES_PER_PAYMENT} lines")
    return assignments
