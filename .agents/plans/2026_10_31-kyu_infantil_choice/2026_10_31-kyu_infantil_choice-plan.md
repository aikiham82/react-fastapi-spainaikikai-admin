---
name: "Kyu infantil choice for Kyu holders"
description: "Pagos offers Licencia Kyu infantil to a child who already holds a Kyu licence, defaulting by birth date"
created_at: "2026-10-31T09:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Kyu infantil choice for Kyu holders

## 🎯 Goal

In "Pagos" > "Pendientes", a child who already holds a Kyu licence (e.g. a 5º Kyu born in 2017) is offered "Licencia Kyu infantil" by default, and every Kyu holder can switch between "Licencia Kyu", "Licencia Kyu infantil" and "Licencia Dan".

## 👀 Context

- [`payment-checklist.ts`](../../../frontend/src/features/annual-payments/utils/payment-checklist.ts): `licenceItemOf` decides infantil for a Kyu holder only by the word "infantil" in the grade text, ignoring the birth date; `licenceChoicesOf` offers a Kyu holder only `[licence, 'dan']`. Members without a licence already default by birth date (≤14) and get all three choices.
- `LicenseSummary` (backend `member_dto.py`) has no `age_category`; not needed, see the matrix: every infantil Kyu licence has a birth date.
- No public contract changes: no endpoint, DTO or copy changes.

### Real data matrix (production, read-only, 2026-10-31, active Kyu licences)

| Licence age category | Member age today | Licences | Expected default |
|---|---|---|---|
| infantil | ≤14 | 186 | Kyu infantil |
| infantil | ≥15 | 30 | Kyu |
| adulto | ≤14 | 9 | Kyu infantil |
| adulto | ≥15 | 217 | Kyu |
| adulto | no birth date | 374 | Kyu (grade text has no "infantil") |
| infantil | no birth date | 0 | - |

Dan and instructor holders keep their current behaviour.

## 🪜 Phases

### Phase 1: Kyu holders default by birth date and can choose Kyu infantil

- [ ] Tests in `payment-checklist.test.ts` for `buildChecklistRows`: `a child holding a Kyu licence defaults to Kyu infantil`, `a Kyu holder aged 15 or more defaults to Kyu`, `a Kyu holder without birth date falls back to the grade text`, `a Kyu holder can choose Kyu, Kyu infantil or Dan`, `a Dan holder keeps no choice`.
- [ ] `licenceItemOf`: for a Kyu holder, use the birth date when known, else the grade text. `licenceChoicesOf`: Kyu holders get `CHOOSABLE_LICENCE_ITEMS`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement phase 1.
