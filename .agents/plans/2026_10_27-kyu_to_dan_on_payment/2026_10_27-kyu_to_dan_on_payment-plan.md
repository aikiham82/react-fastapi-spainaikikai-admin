---
name: "2026_10_27-kyu_to_dan_on_payment"
description: "A club promotes a kyu member to dan by paying Licencia Dan in Pendientes; the completed payment turns the member's own licence into 1º Dan."
created_at: "2026-10-27T19:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"
implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"

last_implementation_at: "2026-10-27T20:00:00Z"
has_completed_all_phases: true
---

# Kyu to dan on payment

## 🎯 Goal

When a kyu member passes to dan, the club ticks "Licencia Dan" for them in Pendientes and pays; the completed payment turns that member's own licence into "1º Dan" (same licence number) and renews it, instead of leaving it as kyu or creating a second licence.

## 👀 Context

- The grade lives on the licence, not on the member. Only a super admin may edit a licence (`PUT /api/v1/licenses/{id}`), so today a club cannot reflect a promotion and pays a dan as Kyu.
- Pendientes offers a licence choice only to members without a licence (`licenceChoosable: !member.license_summary` in [`payment-checklist.ts`](../../../frontend/src/features/annual-payments/utils/payment-checklist.ts)).
- [`generate_licenses_from_payment_use_case.py`](../../../backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py) renews a licence only when technical grade and instructor category match; a Licencia Dan for a kyu member creates a second, generic "Dan" licence.
- Rules: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md) (a licence is the payment of one year), [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md).
- Variety matrix (production, read-only, 2026-10-27): every member holds one licence renewed yearly; kyu adulto 587, kyu infantil 215, dan 382 (with or without instructor title), kyu with an instructor category 14. Grade stored as text ("6º Kyu", "1er Dan"); `dan_grade` unused.

## 🪜 Phases

### Phase 1: Promote on payment

- [x] Backend tests: a Licencia Dan payment for a kyu adulto, a kyu infantil and a kyu with instructor category turns that same licence into technical grade dan, licence type dan, grade "1º Dan", keeping number, age category and instructor category, and renews it to the year; a dan paying dan only renews; running it twice does not duplicate.
- [x] Backend: when no matching licence exists for a Licencia Dan, promote the member's latest kyu licence, then renew it.
- [x] Frontend tests: a kyu member can choose Licencia Dan in Pendientes; a dan member cannot choose a kyu licence; instructors keep their fixed licence.
- [x] Frontend: licence choice offered to kyu members as well as members without licence.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases implemented. Next: review and QA.

Black belt earned and recorded: 🐢 💨 🥋 ⚫ (Turbotuga™, [Codely](https://codely.com)'s mascot).
