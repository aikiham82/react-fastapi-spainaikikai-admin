---
name: "no_double_card_charge"
description: "Two card payments cannot charge the same licence, title or insurance twice"
created_at: "2026-11-04T14:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"
---

# No double card charge

## Goal

Only completed lines are checked when a card payment starts, so two tabs can each reach the bank and charge the same item twice. Refuse the second payment before the bank, and if the bank still charges twice, keep the data clean and alert that money must be returned by hand.

## Context

- [`initiate_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py): checks completed lines only.
- [`complete_payment_use_case.py`](../../../backend/src/application/use_cases/payment/complete_payment_use_case.py): `_create_member_payments` writes lines after the bank charged, so it must never fail on a duplicate.
- [`docs/domain/a-payment-is-fulfilled-once.md`](../../../docs/domain/a-payment-is-fulfilled-once.md), [`docs/security/sentry-collects-no-personal-data.md`](../../../docs/security/sentry-collects-no-personal-data.md).

Production on 2026-11-04: no duplicated completed line. Of 22 card payments the slowest took 10.2 minutes from start to paid, most under 2. Decided with the owner: a 20 minute window, a Sentry alert with ids only, a unique index created after the deploy.

Real varieties, each a test case: same member and item in flight; same member, another item; another member; a licence in flight for another year; an insurance in flight for another form year, since it covers today's season; the club fee in flight; an in-flight payment older than the window; a failed payment.

## Phases

### Phase 1: a second payment is refused before the bank

Description: while a card payment is in flight for a member and item, a new one answers 400.

Public contracts:

- Port: `PaymentRepositoryPort.find_unfinished_annual(club_id, since) -> List[Payment]`.
- HTTP: `POST /payments/annual/initiate` answers 400.
- Copy: `Ya hay un pago con tarjeta en curso para {nombres}. Si lo has dejado a medias, inténtalo de nuevo en 20 minutos.`
- Test suite: `test_no_double_card_charge.py`.

To-do:

- [x] Write the failing tests.
- [x] Add the port, the adapter and the check.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: a second charge leaves the data clean and alerts

Description: a completing payment skips lines already completed for that member, year and type, and reports an error to Sentry with ids only. Its other lines, its invoice and its completion go on. Pending lines do not count.

Public contracts:

- Test suite: new cases in `test_no_double_card_charge.py`.

To-do:

- [x] Write the failing tests.
- [x] Skip the lines and report them.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: a unique index as the last barrier

Description: a partial unique index on completed lines by member, year and type. `create_bulk` skips a duplicate and reports it instead of failing; `update` answers a business error.

Public contracts:

- MongoDB: `member_payments` index `unique_completed_line` on `member_id`, `payment_year`, `payment_type`, partial on `status: completed`.
- Script: `scripts/create_member_payment_unique_index.py`, a dry run unless `--execute`.

To-do:

- [x] Write the failing tests against a local Mongo.
- [x] Handle duplicates in the adapter and add the script.
- [x] Record the rule in `docs/domain/a-payment-is-fulfilled-once.md`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] After the deploy, run the script in production and re-read the indexes.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

One charge per belt, tied by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
