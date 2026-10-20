---
name: "Mark paid members in the annual payment selector"
description: "The annual payment member selector disables the concepts each member already paid for the selected year, so a club admin never hits the duplicate-payment 400."
created_at: "2026-10-20T10:00:00Z"

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
last_implementation_at: "2026-10-20T11:00:00Z"
has_completed_all_phases: true
---

# Mark paid members in the annual payment selector

## Goal

In the annual payment form, the member selector shows which concepts each member already paid for the selected year and blocks selecting them again. The backend already rejects those duplicates with a 400; the selector must stop the user before that.

## Context

- Trigger: on 2026-10-20 a club admin (Musubi) got "Request failed with status code 400" paying 5 accident insurances. The club had already paid accident insurance for 9 members in October and the selector does not know who paid.
- Backend:
  - [`prefill_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py): already builds `paid_set` of `(member_id, item_type)` from COMPLETED member payments of the year, including the implicit `seguro_rc` for fukushidoin/shidoin. It only uses it to exclude items; it never returns it.
  - [`payments.py`](../../../backend/src/infrastructure/web/routers/payments.py) `GET /payments/annual/prefill`, guarded by `require_club_access`.
  - [`annual_payment_dto.py`](../../../backend/src/infrastructure/web/dto/annual_payment_dto.py): `PrefillAnnualPaymentResponse`.
  - [`initiate_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py): the duplicate check that answers 400.
- Frontend:
  - [`MemberSelectionTable.tsx`](../../../frontend/src/features/member-payments/components/MemberSelectionTable.tsx): the selector. Only disabled state today is `seguro_rc` when an instructor title is checked.
  - [`MemberSelectionSection.tsx`](../../../frontend/src/features/annual-payments/components/MemberSelectionSection.tsx): its only caller.
  - [`useAnnualPaymentContext.tsx`](../../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx): already fetches the prefill per club and year.
  - [`annual-payment.schema.ts`](../../../frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts): `PrefillAnnualPaymentResponse`.
- Docs: [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md), [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

### Real data matrix (production, club Musubi, year 2026)

| Row | Member already paid | Expected in selector |
|---|---|---|
| 1 | Nothing (94 members) | Every concept enabled |
| 2 | Accident insurance 2026 via the app (14 members) | Accident insurance disabled; RC and licences enabled |
| 3 | Shidoin or fukushidoin title | That title and RC disabled |
| 4 | Kyu or dan licence | That licence disabled |
| 5 | Paid in 2025, year 2026 selected | Every concept enabled |

### Out of scope

- `InitiateAnnualPaymentUseCase` does not apply the implicit RC rule for instructor titles. Own branch.

## Phases

### Phase 1: the selector disables what each member already paid

Return the paid pairs from the prefill and use them in the selector.

- [x] Test suite `test_prefill_annual_payment_use_case.py`, new cases:
  - `test_prefill_returns_paid_assignments_for_completed_payments`
  - `test_prefill_paid_assignments_include_implicit_rc_for_instructors`
  - `test_prefill_paid_assignments_ignore_other_years`
- [x] `PrefillResult.paid_assignments: List[PrefillMemberAssignment]`, built from `paid_set` (empty on the previous-payment fallback).
- [x] HTTP contract: `PrefillAnnualPaymentResponse.paid_assignments: [{member_id, member_name, payment_types}]` with selector keys (`kyu`, `seguro_rc`...).
- [x] Frontend schema: `PrefillAnnualPaymentResponse.paid_assignments`.
- [x] Test suite `MemberSelectionTable.test.tsx`, new cases:
  - `disables and marks the concept a member already paid`
  - `select-all of a column skips members who already paid it`
- [x] `MemberSelectionTable` prop `paidAssignments?: MemberPaymentAssignment[]` and `paidYear?: number`: paid cells disabled, unchecked, with a check icon and the tooltip `Ya pagado en {año}`; select-all skips them.
- [x] `MemberSelectionSection` passes the prefill `paid_assignments` and the payment year.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented; run the quality and QA passes before merging.

No more duplicate insurance surprises, guarded by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
