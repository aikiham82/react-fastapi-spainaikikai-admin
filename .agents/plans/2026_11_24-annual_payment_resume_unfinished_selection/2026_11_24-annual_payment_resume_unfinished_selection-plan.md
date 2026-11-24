---
name: "Annual payment resumes the unfinished selection"
description: "The annual payment screen ticks again what the club chose in its latest unfinished payment of that year"
created_at: "2026-11-24T09:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Annual payment resumes the unfinished selection

## Goal

When a club opens the annual payment screen for a year and its latest annual payment of that year was never charged, the screen ticks again what the club chose in it (minus what is already paid) and says so.

## Context

- Request: Guille (secretary), WhatsApp 23/11/2026: a club that fills the selection and cannot finish the payment has to tick everything again.
- Prefill: [`prefill_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py), `GET /payments/annual/prefill` in [`payments.py`](../../../backend/src/infrastructure/web/routers/payments.py), DTO in [`annual_payment_dto.py`](../../../backend/src/infrastructure/web/dto/annual_payment_dto.py).
- Port and adapter: [`payment_repository.py`](../../../backend/src/application/ports/payment_repository.py), [`mongodb_payment_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py) (collection `transactions`).
- Initiate stores `member_assignments` and `line_items_data` (club fee as `item_type: "club_fee"`): [`initiate_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py).
- Frontend: [`useAnnualPaymentContext.tsx`](../../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx), [`PendingPayments.tsx`](../../../frontend/src/features/annual-payments/components/PendingPayments.tsx), [`annual-payment.schema.ts`](../../../frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts).
- Docs: `docs/domain/payments-never-guess-paid-state.md`, `docs/domain/a-payment-is-fulfilled-once.md`, `docs/testing/fixtures-are-real-entities.md`.
- The 20-minute in-flight refusal stays untouched: it prevents charging the same item twice.

### Real varieties (production, read-only, 2026-11-24)

69 completed annual payments and 22 not completed (14 `failed`, 7 `processing`, 1 `cancelled`) across 11 club/year combinations.

| # | Real sequence for a club/year | Expected |
|---|---|---|
| A | failed, then completed with the same selection | latest is completed: default prefill |
| B | failed, failed, processing, nothing completed | restore the latest attempt |
| C | failed x3, processing, completed (transfer, part), failed | restore the latest, minus what is paid |
| D | processing, then completed with a bigger selection | latest is completed: default prefill |
| E | cancelled, then completed | default prefill; cancelled is never restored |
| F | latest unfinished, but all of it paid since | default prefill, no notice |

## Phases

### Phase 1: resume the latest unfinished selection

Description: port method, adapter, prefill branch, frontend source value and notice, with tests.

- [ ] Add `PaymentRepositoryPort.find_latest_annual(club_id: str, payment_year: int) -> Optional[Payment]` and its Mongo implementation (`find_one`, sorted by `created_at` desc).
- [ ] In `PrefillAnnualPaymentUseCase.execute`, when the latest annual payment is `pending`, `processing` or `failed`, return its `member_assignments` filtered to active members and unpaid items, its club fee if still unpaid, its payer name, and `source="unfinished_payment"`. Fall back to the default prefill when nothing is left.
- [ ] Tests in `test_prefill_annual_payment_use_case.py`, one per row A to F.
- [ ] Frontend: `source` accepts `'unfinished_payment'`; context exposes `resumedUnfinished`; `PendingPayments` shows "Hemos dejado marcado lo que elegiste en tu último pago, que no llegó a completarse."
- [ ] Tests: `useAnnualPaymentContext.test.tsx` (applies restored selection, exposes the flag) and `PendingPayments.test.tsx` (shows the notice).
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Plan that never forgets your basket, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
