---
name: "Club payments open on the season year"
description: "The club payments screen opens on, and offers, the payment year the payment form uses, so an autumn insurance shows as paid."
created_at: "2026-10-25T17:30:00Z"

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

last_implementation_at: "2026-10-25T17:50:00Z"
has_completed_all_phases: "true"
---

# Club payments open on the season year

## Goal

The Pagos screen opens on `defaultPaymentYear(today)` (N+1 from October to December) and its year selector offers that year, so a club that paid its autumn insurance sees it paid at the price it paid.

## Context

- Reported 2026-10-25 by Muzen Dojo: insurance shows paid at 15 € although they paid 20 €. Production data (read-only) is right: 19 `seguro_accidentes` of 15 € for payment year 2026 (Excel import, season 2025-26) and 15 of 20 € for payment year 2027 (paid 2026-10-21, season 2026-27).
- Root cause: since 2026-10-20 an insurance paid October-December belongs to payment year N+1 ([`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md)) and the payment form proposes N+1 (`defaultPaymentYear`), but the status screen still opens on the calendar year ([`useClubPaymentsContext.tsx:30`](../../../frontend/src/features/club-payments/hooks/useClubPaymentsContext.tsx)) and its selector lists only the calendar year and the four before ([`ClubPaymentsPage.tsx:15`](../../../frontend/src/features/club-payments/components/ClubPaymentsPage.tsx)), so 2027 cannot even be chosen.
- Musubi Aikido (Granada) also reported spring 2026 payments not shown as paid. Production data has every spring payment with its member payment, licence and insurance; not reproduced, pending the club's screen. Not part of this plan.
- Helper: [`frontend/src/core/utils/defaultPaymentYear.ts`](../../../frontend/src/core/utils/defaultPaymentYear.ts).
- Docs: [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md), [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md).

### Real data matrix

Dates that change the year: 30 September (calendar year), 1 October (N+1), 31 December (N+1), 1 January (new calendar year, same as N+1 of the day before).

## Phases

### Phase 1: open on the season year

- [x] `ClubPaymentsProvider` starts `selectedYear` at `defaultPaymentYear(new Date())`.
- [x] `ClubPaymentsPage` lists five years counting down from `defaultPaymentYear(new Date())`.
- [x] Test suite `frontend/src/features/club-payments/components/__tests__/ClubPaymentsPage.test.tsx`:
  - `opens on the next year from October and still offers the current one`
  - `opens on the calendar year until September`
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are implemented; next is review, QA and merge.

Calendar turned to next season by 📅 → 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
