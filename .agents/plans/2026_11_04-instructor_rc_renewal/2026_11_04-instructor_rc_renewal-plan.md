---
name: "instructor_rc_renewal"
description: "Renovar on an instructor's expired RC ticks the pending title, which includes the RC"
created_at: "2026-11-04T12:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"
---

# Instructor RC renewal

## Goal

"Renovar" on the expired RC row of a shidoin or fukushidoin lands on "Este miembro no tiene nada pendiente de renovar" even when the title is unpaid. It must tick the pending title, because the title is how an instructor pays the RC.

## Context

- [`payment-checklist.ts`](../../../frontend/src/features/annual-payments/utils/payment-checklist.ts): `renewalAssignments` and `RENEWED_ITEMS`. `pendingInsuranceOf` never offers RC to an instructor, so filtering pending items by `seguro_rc` leaves nothing.
- [`useAnnualPaymentContext.tsx`](../../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx): applies the renewal and shows the notice when it is empty.
- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md): "A title includes the RC insurance" and the Renovar rule.

Real varieties in production on 2026-11-04, instructors by latest RC and title of 2027:

| Category | Latest RC | Title 2027 | Members | Expected from Renovar RC |
|---|---|---|---|---|
| shidoin | expired | pending | 31 | title ticked |
| fukushidoin | expired | pending | 20 | title ticked |
| shidoin | in force | paid | 2 | no button |
| fukushidoin | in force | paid | 1 | no button |
| shidoin | in force | pending, RC paid apart | 1 | no button |
| any | none | pending | 48 | no row, no button |

Decided with the owner: no production data changes. The 15/10/2026 payment stays in year 2025 and its 35 € RC line stays until the owner decides.

## Phases

### Phase 1: Renovar RC ticks the instructor's title

Description: an RC renewal also selects the instructor's pending title. A paid title still gives the "nada pendiente" notice, and non-instructors keep ticking RC.

Public contracts:

- Test suite `renewalAssignments` in `payment-checklist.test.ts`, new cases:
  - ticks the pending title when renewing the RC of a shidoin
  - ticks the pending title when renewing the RC of a fukushidoin
  - ticks nothing when the instructor's title is already paid
  - does not tick the title when renewing an instructor's accident insurance
- `renewalAssignments(rows, memberId, kind)`: signature unchanged, `rc` also matches instructor items.

To-do:

- [x] Write the failing test cases.
- [x] Make `RENEWED_ITEMS.rc` match instructor titles.
- [x] Record the rule in `docs/domain/payment-cycles.md`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`npm run lint && npm run build && npm run test`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1, the only phase.

Plan pushed through the dojo by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
