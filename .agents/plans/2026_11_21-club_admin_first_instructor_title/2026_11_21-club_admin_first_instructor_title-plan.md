---
name: "club_admin_first_instructor_title"
description: "A club admin may pay Licencia Shidoin or Fukushidoin for a member who holds no licence, without charging the RC the title already includes"
created_at: "2026-11-21T10:00:00Z"

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

last_implementation_at: "2026-11-21T11:00:00Z"
has_completed_all_phases: "true"
---

# A club admin pays the first title of a member without licence

## Goal

On 2026-11-20 the Kotodama club admin could not pick "Licencia Shidoin" for a new member with no licence in «Pagos». Let a club admin choose Shidoin or Fukushidoin for a member holding no licence, server and screen alike, and never charge the RC insurance on top of a title.

## Context

- Server rule: [`payable_licence_items`](../../../backend/src/domain/entities/license.py) returns only `GRADE_ITEMS` for a member without licences. It is enforced for club admins in card payment and manual payment ([`payments.py`](../../../backend/src/infrastructure/web/routers/payments.py)) and when a line changes type ([`member_payments.py`](../../../backend/src/infrastructure/web/routers/member_payments.py)) through [`refuse_licences_that_do_not_fit.py`](../../../backend/src/application/use_cases/payment/refuse_licences_that_do_not_fit.py).
- Paying a title creates a `dan` licence with that `instructor_category` and the season's RC ([`generate_licenses_from_payment_use_case.py`](../../../backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py)); price keys `dan-shidoin-adulto` and `dan-fukushidoin-adulto` exist in production (70 €).
- Screen: [`payment-checklist.ts`](../../../frontend/src/features/annual-payments/utils/payment-checklist.ts) `CHOOSABLE_LICENCE_ITEMS` and `licenceChoicesOf`; [`PaymentChecklist.tsx`](../../../frontend/src/features/annual-payments/components/PaymentChecklist.tsx). The RC chip follows `row.offersRc`, computed from the default licence, not the chosen one: picking a title on a member defaulting to kyu would still charge RC.
- Docs: [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md) (line 51 says only a super admin records a first title), [`docs/domain/a-club-changes-the-grade-number-not-the-kind.md`](../../../docs/domain/a-club-changes-the-grade-number-not-the-kind.md).

### Real cases

| Member | Choices offered | RC |
|---|---|---|
| No licence, picks kyu / kyu_infantil / dan | the five items | charged apart |
| No licence, picks shidoin / fukushidoin | the five items | not offered, note "Licencia Shidoin incluye el seguro RC" |
| Holds a kyu licence | kyu or kyu_infantil, and dan (unchanged) | unchanged |
| Holds a dan or a title | none (unchanged) | unchanged |

Out of scope: a dan holder becoming an instructor from the club.

## Phases

### Phase 1: a member without licence can be paid a title

Server and screen allow the title; the RC follows the chosen licence.

- [x] `payable_licence_items`: no licences returns `LICENCE_ITEMS`.
- [x] `test_payable_licence_items.py`: case "no licence" expects the five items.
- [x] `test_club_admin_licence_must_fit.py`: `test_a_club_admin_pays_a_first_title_for_a_member_without_licence`.
- [x] `CHOOSABLE_LICENCE_ITEMS` adds `fukushidoin` and `shidoin`.
- [x] `pendingInsuranceOf(row, licence)` drops RC when the chosen licence is a title; `MemberRow`, `sanitizeAssignments`, `tickAllPending` and `chooseLicence` use the chosen licence, so choosing a title unticks RC.
- [x] RC note uses the chosen licence.
- [x] Tests: "lets a member without licence choose Shidoin or Fukushidoin", "choosing a title drops the RC".
- [x] Update `docs/domain/payment-cycles.md`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are complete: run code review and QA, then merge.

A new shidoin walks onto the mat, paid once, thanks to [Codely](https://codely.com). 🥋 < 🐢 💨
