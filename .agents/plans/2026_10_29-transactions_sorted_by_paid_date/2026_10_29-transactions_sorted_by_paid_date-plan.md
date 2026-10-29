---
name: "Transactions sorted by paid date"
description: "A club's Transacciones list shows when each line was paid and lists the most recently paid first"
created_at: "2026-10-29T13:05:06Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Transactions sorted by paid date

## 🎯 Goal

In "Pagos" > club > "Transacciones", every line shows when and how it was paid, and the list comes most recently paid first, so the super admin can see the latest payment updates at a glance.

## 👀 Context

- [`get_club_member_payments_use_case.py`](../../../backend/src/application/use_cases/member_payment/get_club_member_payments_use_case.py): `GetClubMemberPaymentsUseCase.execute(club_id, payment_year)` builds the list; nothing on the path sorts today, so order is Mongo's natural order.
- [`line_payments.py`](../../../backend/src/application/use_cases/member_payment/line_payments.py): `LinePayment.paid` is the completed transaction behind a completed line; its `payment_date` is the line's `paid_at`.
- [`mongodb_member_payment_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py): `find_by_member_ids_year` has four other callers, so the sort lives in the use case, not the repository.
- [`TransactionsSection.tsx`](../../../frontend/src/features/club-payments/components/TransactionsSection.tsx): renders no date today.
- [`payment-labels.ts`](../../../frontend/src/features/club-payments/utils/payment-labels.ts): `getPaidLabel` already renders "Pagado el DD/MM/YYYY · método" / "Sin fecha de pago".
- Docs: [`a-payment-line-shows-a-date-only-when-paid.md`](../../../docs/domain/a-payment-line-shows-a-date-only-when-paid.md), [`dates-and-money-use-core-formatters.md`](../../../docs/conventions/dates-and-money-use-core-formatters.md), [`list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md).

### Real data matrix (production, read-only, 2026-10-29)

All 1104 member payment lines are completed and their transaction (`transactions`) is completed with a `payment_date`.

| Variety | Lines | Transactions | Test case |
|---|---|---|---|
| Card (redsys) | 177 | 19 | most recent first |
| Cash (manual) | 1 | 1 | most recent first |
| Excel import, no method | 926 | 32 (Feb to Jun 2026) | many lines share a date: tie broken by member name |
| Line not paid / no dated transaction | 0 today | - | goes last |

## 🪜 Phases

### Phase 1: Transactions show the paid date, newest first

Sort in the use case by the paid date of each line, newest first, undated last, ties by member name; render `getPaidLabel` in a new "Pago" column (desktop) and line (mobile card).

- [ ] Backend tests in `test_get_club_member_payments_use_case.py`: `test_lines_come_most_recently_paid_first`, `test_lines_without_a_paid_date_go_last`, `test_lines_paid_together_are_ordered_by_member_name`.
- [ ] Sort the result of `GetClubMemberPaymentsUseCase.execute` (signature unchanged).
- [ ] Frontend tests in `TransactionsSection.test.tsx`: `shows when and how each paid line was paid`, `keeps the order the API returns`.
- [ ] `TransactionsSection`: "Pago" column and mobile line with `getPaidLabel`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1.

Sorted newest first by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)’s mascot).
