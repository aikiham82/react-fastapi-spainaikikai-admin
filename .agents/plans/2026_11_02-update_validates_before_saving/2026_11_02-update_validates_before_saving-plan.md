---
name: "Updates validate before saving"
description: "An edit can no longer store a value the entity refuses, which then made a whole listing answer 500 for everyone."
created_at: "2026-11-02T18:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# Updates validate before saving

## Goal

No edit stores what the entity would refuse when read back, so one bad row can no longer take down a listing for everyone.

## Context

- Root cause: entities validate only in `__post_init__`, and repositories rebuild them on every read. Update use cases change fields and save, so the bad value is stored and the next read raises `ValueError` for the whole list.
- [`update_payment_use_case.py`](../../../backend/src/application/use_cases/payment/update_payment_use_case.py), [`update_member_payment_use_case.py`](../../../backend/src/application/use_cases/payment/update_member_payment_use_case.py), [`delete_member_payment_use_case.py`](../../../backend/src/application/use_cases/payment/delete_member_payment_use_case.py): the three ways a payment amount changes; [`payment.py`](../../../backend/src/domain/entities/payment.py) refuses a refund above the amount.
- [`update_seminar_use_case.py`](../../../backend/src/application/use_cases/seminar/update_seminar_use_case.py), [`update_member_use_case.py`](../../../backend/src/application/use_cases/member/update_member_use_case.py), [`update_club_use_case.py`](../../../backend/src/application/use_cases/club/update_club_use_case.py): `setattr` with no validation.
- Docs: [`money-is-limited-where-it-enters.md`](../../../docs/conventions/money-is-limited-where-it-enters.md), [`backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md).
- No switch hides any of this.

### Real data matrix (read-only production query, 2026-11-02)

| Variety | Production | Case |
|---|---|---|
| Refunded payments | None of 79 | Refund below, equal to and above the new amount |
| Payment with lines | Parent amount is the sum of its completed lines | Edit a line, cancel a line, delete a line under a refund |
| Seminar `max_participants` | 6 set, 4 null | Null stays accepted; negative refused |
| Seminar dates | 10 ordered | Only start, only end, both inverted; equal dates accepted |
| Seminar price | 0 to 75 | Unchanged by this plan |

No data to repair.

## Phases

### Phase 1: a payment never drops below its refund

Public contracts:
- `Payment.ensure_covers_refund(amount)`: raises `InvalidPaymentDataError`.
- `PUT /payments/{id}`, `PUT /member-payments/{id}` and `DELETE /member-payments/{id}`: 400, nothing saved.
- Spanish copy: "El importe no puede ser menor que lo ya reembolsado".
- Test cases: each path below, equal to and above the refund; a payment with no refund is unaffected; the line is not saved or deleted when refused.

To-do:
- [ ] Write the failing tests.
- [ ] Add the check before each save.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: editing a seminar validates before saving

Public contracts:
- `apply_changes(entity, changes)`: returns a new entity through the same validation, raising the domain `ValidationError`.
- `PUT /seminars/{id}`: 422, nothing saved.
- Spanish copy: "Hay datos no válidos. Revísalos e inténtalo de nuevo."
- Test cases: blank title, instructor or venue; negative participants; inverted dates by changing one or both; valid edits and `None` values still behave as before.

To-do:
- [ ] Write the failing tests.
- [ ] Add `apply_changes` and use it.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: the same for members and clubs

Public contracts:
- `PUT /members/{id}` and `PUT /clubs/{id}`: 422, nothing saved.
- Test cases: blank first name, invalid email and blank club name refused; valid edits still saved.

To-do:
- [ ] Write the failing tests.
- [ ] Use `apply_changes`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Lists that stay up, planned by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
