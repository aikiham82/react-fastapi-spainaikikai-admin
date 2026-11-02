---
name: "Payment screens leftovers"
description: "Drop the raw concept from Transacciones, fit its table at 768, make the dialog total add up and keep members who had not joined off the unpaid list."
created_at: "2026-11-02T14:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# Payment screens leftovers

## Goal

Clubs stop reading internal keys in Transacciones, the table fits at 768 wide, the "Ver pagos" total adds up on screen, and the unpaid list leaves out members who had not joined in the requested year.

## Context

- [`TransactionsSection.tsx`](../../../frontend/src/features/club-payments/components/TransactionsSection.tsx): table with the `Concepto` column at line 119, cards below `md`.
- [`MemberPaymentEditModal.tsx`](../../../frontend/src/features/club-payments/components/MemberPaymentEditModal.tsx): editable `Concepto` input showing the same key.
- [`MemberPaymentStatus.tsx`](../../../frontend/src/features/member-payments/components/MemberPaymentStatus.tsx): dialog printing `total_paid`, which includes `cuota_club`, without a line for it.
- [`get_unpaid_members_use_case.py`](../../../backend/src/application/use_cases/member_payment/get_unpaid_members_use_case.py): selects active members with no join-date filter. `Member.joined_by` is already used by both club summaries and the annual payment prefill.
- Docs: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`member-join-date.md`](../../../docs/domain/member-join-date.md), [`list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md).
- No switch hides any of this: the join filter simply was not applied to this use case.

### Real data matrix (read-only production query, 2026-11-02)

| Variety | Production | Case |
|---|---|---|
| `concept` of a member payment | 1104 lines, all `<type> - <year>`, none free text; 1 title line whose concept says `seguro_accidentes` | Column and input removed; export keeps the stored value |
| `cuota_club` line | 12 completed lines of 100 €, on one member of each club | Member with it sees the line and a total that adds up; others see nothing |
| Join date | About 700 members with no `registration_date`, falling back to `created_at` | Joined before, in and after the year; null `registration_date` |

Decided with the user: remove the concept (not translate it) and show the club fee line (not take it out of the total).

## Phases

### Phase 1: Transacciones without internal keys

Remove the `Concepto` column and the edit input, which also gives the table room at 768.

Public contracts:
- Spanish copy: column "Concepto" and input "Concepto" removed. The API and the Excel export keep `concept`.
- Test cases: `TransactionsSection` does not print the stored concept and has no `Concepto` header; `MemberPaymentEditModal` has no `Concepto` field and does not send `concept`.

To-do:
- [ ] Write the failing tests.
- [ ] Remove the column and the input.
- [ ] Measure the table at 768 and 1024 and fix whatever still scrolls.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`npm run lint && npm run build && npx vitest run`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the dialog total adds up

Show the club fee in "Ver pagos" for the member who has it, with no backend change.

Public contracts:
- Spanish copy: new line "Cuota de Club" with its amount, only when paid.
- Test cases: `MemberPaymentStatus` shows the line and its amount when `cuota_club` is paid; shows no line when it is not.

To-do:
- [ ] Write the failing tests.
- [ ] Render the line.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`npm run lint && npm run build && npx vitest run`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: the unpaid list follows the join date

Apply `joined_by(payment_year)` when picking members.

Public contracts:
- `GetUnpaidMembersUseCase.execute`: same signature; `total_count` and `unpaid_members` leave out members who joined after `payment_year`.
- Test cases: joined before and in the year are listed; joined after is not; null `registration_date` follows `created_at`.
- Docs: `member-join-date.md` names the unpaid list.

To-do:
- [ ] Write the failing tests.
- [ ] Apply the filter and extend the doc.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Tidy tables delivered by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
