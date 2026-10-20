---
name: "Autumn payments belong to the next payment year"
description: "The annual payment form defaults to N+1 from October to December, and insurance member payments are identified by their season year, not by the form year."
created_at: "2026-10-20T11:30:00Z"

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
last_implementation_at: "2026-10-20T11:45:00Z"
has_completed_all_phases: false
---

# Autumn payments belong to the next payment year

## Goal

From October to December the annual payment form proposes payment year N+1, and every insurance member payment records the year of the season it covers, so duplicate checks and paid marks compare insurances by season and a renewal is never blocked by the previous, expired season.

## Context

- Decision (2026-10-20, [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md)): an insurance paid October-December belongs to payment year N+1.
- Trigger: a club renewing accident insurance on 2026-10-20 got a 400 because a June 2026 insurance (season ended 2026-09-30) was recorded as year 2026.
- The form year means two things today:
  - Licence: calendar year from the form year ([`generate_licenses_from_payment_use_case.py:79`](../../../backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py)).
  - Insurance: season from the payment date (`insurance_season_year(paid_at)` in [`generate_insurance_from_payment_use_case.py`](../../../backend/src/application/use_cases/insurance/generate_insurance_from_payment_use_case.py)), but its member payment stores the form year ([`process_redsys_webhook_use_case.py`](../../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py) `_create_member_payments`).
- Season helpers: [`insurance.py`](../../../backend/src/domain/entities/insurance.py) `insurance_season(payment_year)` and `insurance_season_year(on)`.
- Duplicate checks by year: [`initiate_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py), [`prefill_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py).
- Frontend year defaults: [`annual-payment.schema.ts`](../../../frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts) (`currentYear` for default and zod bounds), [`PayerDataSection.tsx`](../../../frontend/src/features/annual-payments/components/PayerDataSection.tsx) (year options).
- Docs: [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/domain/data-model.md`](../../../docs/domain/data-model.md) (naive datetimes, `datetime.utcnow()`), [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md).

### Real data matrix (production, completed annual payments of 2026)

| Row | Paid in | Content | Form year | Count | Expected |
|---|---|---|---|---|---|
| A | October | Insurance only | N (2026) | 3 | Insurance member payments recorded as N+1 |
| B | October | Licences + insurance | N-1 (2025) | 1 | Licence N-1, insurance N+1 |
| C | January-September | Licences + insurance | N | 5 | Everything N |
| D | January-September | Licences or club fee only | N | 34 | Unchanged |

Edges: 30 September 23:59:59 and 1 October 00:00 (naive UTC).

### Out of scope

- Manual payments by the super admin (explicit year).
- Read summaries defaulting to the current year.

## Phases

### Phase 1: the form proposes N+1 from October to December

- [x] Test suite `frontend/src/core/utils/__tests__/defaultPaymentYear.test.ts`:
  - `proposes the current year until 30 September`
  - `proposes the next year from 1 October`
  - `proposes the next year on 31 December`
- [x] `defaultPaymentYear(today: Date): number` in `frontend/src/core/utils/defaultPaymentYear.ts`.
- [x] Annual payment default value derives from `defaultPaymentYear(new Date())`. Year options and zod bounds stay calendar based (N-1..N+1): row B pays N-1 licences in October and the backend DTO validator accepts current year +-1.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: insurances are identified by their season year

- [ ] Tests:
  - Webhook: `test_an_october_payment_records_insurance_in_the_next_season_year_and_licence_in_the_form_year` (rows A, B), `test_a_september_payment_records_insurance_in_the_form_year` (row C, edge 30 September 23:59:59).
  - Initiate: `test_an_insurance_of_the_expired_season_does_not_block_an_autumn_renewal`, `test_an_insurance_of_the_current_season_blocks_a_new_one`.
  - Prefill: `test_paid_insurances_are_marked_by_the_current_season_year`.
- [ ] Webhook `_create_member_payments`: insurance member payments store `insurance_season_year(paid_at)`; licences and club fee keep `payment.payment_year`.
- [ ] `InitiateAnnualPaymentUseCase` and `PrefillAnnualPaymentUseCase`: insurance types compare against `insurance_season_year(datetime.utcnow())`; other types keep `payment_year`.
- [ ] Update [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md) with the rule now enforced.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: migrate autumn insurances already recorded

- [ ] Test suite `backend/tests/scripts/test_migrate_autumn_insurance_year.py`:
  - `test_an_autumn_insurance_recorded_with_the_form_year_moves_to_its_season_year`
  - `test_licences_and_september_insurances_are_left_alone`
  - `test_dry_run_changes_nothing`
- [ ] `backend/scripts/migrate_autumn_insurance_year.py`, dry run by default, `--apply` to write; prints each change.
- [ ] Do NOT run it against production without explicit user permission.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 2.

One season, one year, no more blocked renewals, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
