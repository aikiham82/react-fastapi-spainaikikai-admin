---
name: "Payment lines and refund error"
description: "Refuse repeated payment lines and oversized payments, and answer 400 when a refund exceeds the amount."
created_at: "2026-11-03T10:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"

last_implementation_at: "2026-11-03T10:30:00Z"
has_completed_all_phases: "true"
---

# Payment lines and refund error

## Goal

A payment cannot carry repeated lines or an unbounded number of them, and a refund above the amount answers a clear 400.

## Context

- [`manual_payment_dto.py`](../../../backend/src/infrastructure/web/dto/manual_payment_dto.py) and [`annual_payment_dto.py`](../../../backend/src/infrastructure/web/dto/annual_payment_dto.py): assignments accept repeated types and repeated members with no limit; QA stored 14,300 lines in one request.
- [`refund_payment_use_case.py`](../../../backend/src/application/use_cases/payment/refund_payment_use_case.py) and [`payments.py`](../../../backend/src/infrastructure/web/routers/payments.py): `Payment.refund_payment` raises `ValueError`, unmapped, so the route answers 500.
- Docs: [`money-is-limited-where-it-enters.md`](../../../docs/conventions/money-is-limited-where-it-enters.md).

### Real data matrix (read-only production queries, 2026-11-03)

| Variety | Production | Case |
|---|---|---|
| Lines per payment | Up to 154, on up to 77 members | 77 and 500 members accepted; 501 refused |
| Repeated lines | None | Repeated type in a member and repeated member refused |
| Biggest club | 187 members | Under the limit of 500 |
| Refunds | None | Below, equal to and above the amount |

No data to repair.

## Phases

### Phase 1: no repeated lines and a bounded payment

Public contracts:
- `ManualMemberAssignmentDTO` and `MemberPaymentAssignment`: repeated `payment_types` answer 422.
- `ManualPaymentRequest` and `InitiateAnnualPaymentRequest`: a repeated `member_id` or more than 500 members answer 422.
- Test cases: each refusal in both requests; a normal payment and exactly 500 members accepted; a member id repeated with different spaces is refused.

To-do:
- [x] Write the failing tests.
- [x] Add the validators.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: a refund above the amount answers 400

Public contracts:
- `RefundPaymentUseCase.execute`: raises `InvalidRefundAmountError` before changing the payment.
- `PUT /payments/{id}/refund`: 400.
- Spanish copy: "El reembolso no puede superar el importe del pago".
- Test cases: above refused and not saved; equal and below saved; no amount refunds the whole payment.

To-do:
- [x] Write the failing tests.
- [x] Refuse it in the use case and map it in the route.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are complete.

A clear answer on every refund from 💶 🧾 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
