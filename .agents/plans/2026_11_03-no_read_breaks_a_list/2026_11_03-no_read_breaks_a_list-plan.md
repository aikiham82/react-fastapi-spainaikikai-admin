---
name: "No read breaks a list"
description: "Close the last two ways a stored value takes a listing down, without hiding any row."
created_at: "2026-11-03T09:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# No read breaks a list

## Goal

A race on a refunded payment and a made-up `club_id` can no longer make `/payments` or `/members` answer 500, and no row is hidden to achieve it.

## Context

- Hiding a bad row was considered and rejected with the user: a missing payment line shows a paid member as unpaid and passes duplicate checks in `initiate_annual_payment_use_case.py`, which [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md) forbids.
- [`payment.py`](../../../backend/src/domain/entities/payment.py): `__post_init__` refuses a refund above the amount, and it also runs on every read. Writes already enforce the rule through `refund_payment` and `ensure_covers_refund`.
- [`mongodb_club_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_club_repository.py): `find_by_ids` calls `ObjectId` on any stored id.
- [`members.py`](../../../backend/src/infrastructure/web/routers/members.py) and [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): `POST /members` refuses an unknown club; `PUT` and the import do not.
- Docs: [`update-use-cases-take-named-fields.md`](../../../docs/conventions/update-use-cases-take-named-fields.md).

### Real data matrix (read-only production queries, 2026-11-02)

| Variety | Production | Case |
|---|---|---|
| Refunded payments | None of 79 | Refund above the amount is read and listed; can be corrected by raising the amount |
| Bad rows of any kind | None found | No data to repair |
| Member `club_id` | Set on members, some with none | Valid, unknown, not an ObjectId, not sent |

## Phases

### Phase 1: a refund above the amount no longer breaks a read

Public contracts:
- `Payment.__post_init__`: stops refusing a refund above the amount. `refund_payment` and `ensure_covers_refund` keep the rule for writes.
- Test cases: such a payment can be built and listed; refunding above the amount and lowering below the refund are still refused; raising the amount of such a payment works.

To-do:
- [ ] Write the failing tests.
- [ ] Move the rule out of the read path.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: a made-up club id cannot break the members list

Public contracts:
- `PUT /members/{id}` and the member import in upsert: an unknown `club_id` gets the same refusal as `POST /members`.
- `MongoDBClubRepository.find_by_ids`: ignores an id that is not an ObjectId.
- Test cases: unknown and malformed ids refused and not stored; a valid club and no club still work; `find_by_ids` with a malformed id returns the valid ones.

To-do:
- [ ] Write the failing tests.
- [ ] Apply the check and the guard.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Every row in its place, planned by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
