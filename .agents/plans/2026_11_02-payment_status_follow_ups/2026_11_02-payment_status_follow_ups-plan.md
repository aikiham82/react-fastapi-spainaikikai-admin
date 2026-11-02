---
name: "payment_status_follow_ups"
description: "Stop showing licences that do not apply as unpaid, align status colours and base the unpaid list on the licence"
created_at: "2026-11-02T13:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

last_implementation_at: "2026-11-02T13:30:00Z"
has_completed_all_phases: "true"
---

# Payment status follow-ups

## Goal

After making insurance optional, the payment screens must stop suggesting debts that do not exist: the dialog shows only the licence paid, a missing licence is amber everywhere, "Completado" is green everywhere, and "unpaid" means without a paid licence.

## Context

Root causes:

- [`get_member_payment_status_use_case.py`](../../../backend/src/application/use_cases/member_payment/get_member_payment_status_use_case.py) loops over every `MemberPaymentType` and does not know the member's grade, so [`MemberPaymentStatus.tsx`](../../../frontend/src/features/member-payments/components/MemberPaymentStatus.tsx) paints every other licence type as unpaid.
- [`ClubPaymentDetail.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentDetail.tsx) shows a missing licence in amber and the dialog in red. Commit `df2abee` made a missing club fee amber everywhere.
- [`TransactionsSection.tsx`](../../../frontend/src/features/club-payments/components/TransactionsSection.tsx) uses the shadcn `Badge` `default` variant, which is `bg-primary`, and the brand primary is red.
- [`get_unpaid_members_use_case.py`](../../../backend/src/application/use_cases/member_payment/get_unpaid_members_use_case.py) treats any completed payment as paid when no type is given, including a club fee or an insurance. No screen calls it: `useUnpaidMembersQuery` has no consumer.
- `PaymentStatusBadge.tsx` has no importer and keeps the old rule that requires insurance.

Conventions: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md).

### Real varieties (completed licence lines of 2026 in production, per member)

| Licence line | Members |
|---|---|
| `licencia_kyu` | 84 |
| `licencia_dan` | 24 |
| `licencia_kyu_infantil` | 18 |
| `titulo_shidoin` | 6 |
| `titulo_fukushidoin` | 2 |
| none | the rest of each club |

No member holds two licence types in 2026. All 1104 `member_payments` in production are `completed`; `pending` and `refunded` exist only in the schema, so they are covered by tests.

## Phases

### Phase 1: the dialog shows only the licence paid

- [x] Test suite `MemberPaymentStatus`, cases:
  - with each paid licence type, only that line appears under "Licencias", in the success tone
  - without a licence, the group and one line "Sin licencia pagada" are amber
  - insurance lines are unchanged
- [x] Copy: add "Sin licencia pagada".
- [x] Change `MemberPaymentStatus.tsx`.
- [x] Delete `PaymentStatusBadge.tsx` and its exports.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Transacciones shows the status with the shared tones

- [x] Test suite `TransactionsSection`, cases: `completed` is `ok`, `pending` is `warn`, `refunded` is `bad`, on the table and on the mobile cards.
- [x] Replace `Badge` and `getStatusVariant` with `StatusBadge` and one shared mapping of statuses to tones.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: the unpaid list is based on the licence

`GetUnpaidMembersUseCase.execute` keeps its signature. Without `payment_type`, a member is unpaid when no completed line is a licence payment.

- [x] Test suite `test_get_unpaid_members_use_case`, cases:
  - insurance only is unpaid
  - club fee only is unpaid
  - each licence type and title is paid
  - with `payment_type` the behaviour is unchanged
- [x] Change `get_unpaid_members_use_case.py`.
- [x] Verify the changes with `cd backend && poetry run pytest`. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are implemented: review, QA and merge.

Fewer false alarms and a green light at last: 🚦 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
