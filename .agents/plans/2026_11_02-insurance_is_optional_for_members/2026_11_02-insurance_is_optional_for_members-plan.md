---
name: "insurance_is_optional_for_members"
description: "A member with the licence paid counts as paid; insurance is shown as information, never as a debt"
created_at: "2026-11-02T12:00:00Z"

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

last_implementation_at: "2026-11-02T12:30:00Z"
has_completed_all_phases: "true"
---

# Insurance is optional for members

## Goal

Insurance is optional for members, so a paid licence is enough to count as paid. The club Historial must say "10 de 10 pagados" for a club whose ten members hold a licence, and no screen outside the Pendientes work list may present a missing insurance as a debt.

## Context

Root cause: [`ClubPaymentDetail.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentDetail.tsx) computes `upToDate` as `license_paid && insurance_paid` and labels a member without insurance "Falta seguro". On Musubi Aikido Murcia this printed "1 de 10 pagados" for ten members with a licence or title paid.

- [`club-payments.schema.ts`](../../../frontend/src/features/club-payments/data/schemas/club-payments.schema.ts): `members_with_license` and `members_with_insurance` already come from the backend, and [`AllClubsSummaryTable.tsx`](../../../frontend/src/features/club-payments/components/AllClubsSummaryTable.tsx) already counts on them.
- [`MemberPaymentStatus.tsx`](../../../frontend/src/features/member-payments/components/MemberPaymentStatus.tsx): a red X beside "Seguros" when `has_all_insurances` is false.
- [`payment-cycles.md`](../../../docs/domain/payment-cycles.md): where the rule is documented.
- [`frontend.md`](../../../docs/conventions/frontend.md) and [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md).

Decisions:

- The counter keeps the word "pagados". Commit `df2abee` chose it on 2026-10-27 so Historial does not contradict Inicio, and "al día" would equal the licence count anyway.
- A title counts as a licence (`is_license_payment`), so a title holder without a licence line is paid.

Out of scope, on purpose:

- Pendientes (`payment-checklist.ts`): it is the list of what can still be bought. Making `isUpToDate` licence-only would remove the insurance tick chips and clubs could not buy the optional insurance.
- The "SIN SEGURO" mark on the card: a true fact, not a debt.
- `get_unpaid_members_use_case.py:93` leaves insurance-only members off the unpaid list: pre-existing, for its own branch.

### Real varieties (completed payments of 2026 in production, per member)

| Licence or title | Accident | RC | Members | Status today | Status after |
|---|---|---|---|---|---|
| yes | no | no | 59 | Falta seguro | Al día |
| yes | yes | no | 38 | Al día | Al día |
| yes | yes | yes | 30 | Al día | Al día |
| yes | no | yes | 7 | Al día | Al día |
| no | yes | yes | 380 | Falta licencia | Falta licencia |
| no | no | no | 2 | Pendiente | Pendiente |

The summary exposes a single `insurance_paid`, so the four licence rows reduce to two test cases (with and without insurance) and the last two rows to one each.

## Phases

### Phase 1: the club Historial counts paid licences

A club with every licence paid reads "N de N pagados", and insurance appears only as information.

- [x] Test suite `ClubPaymentDetail`, cases:
  - a member with the licence and no insurance shows "Al día" and no "Falta seguro"
  - a member with insurance and no licence shows "Falta licencia"
  - a member with nothing paid shows "Pendiente"
  - the counter reads `members_with_license` of `total_members` followed by "pagados"
  - the summary shows `members_with_insurance` "con seguro"
  - the insurance mark of a member without insurance is labelled "Sin seguro"
- [x] Copy: remove "Falta seguro"; "Seguro sin pagar" becomes "Sin seguro"; add "{n} con seguro".
- [x] Change `statusOf` and the counter in `ClubPaymentDetail.tsx`.
- [x] Add the rule to `docs/domain/payment-cycles.md`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the member payments dialog stops marking insurance as a debt

The "Seguros" group of the dialog no longer shows a red X when insurance is missing.

- [x] Test suite `MemberPaymentStatus`, cases:
  - without insurance, "Seguros" has no danger icon
  - with all insurances, "Seguros" keeps the success icon
  - without licence, "Licencias" keeps the danger icon
- [x] Change `PaymentGroup` in `MemberPaymentStatus.tsx`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are implemented: review, QA and merge.

The licence crossed the line, the insurance waved from the stands: 🪪 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
