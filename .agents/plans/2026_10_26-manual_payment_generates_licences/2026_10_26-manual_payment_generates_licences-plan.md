---
name: "Manual payment generates licences and insurance"
description: "A manual (cash/transfer) payment creates or renews the member's licence and insurance, exactly like a Redsys card payment."
created_at: "2026-10-26T15:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Manual payment generates licences and insurance

## Goal

Registering a manual payment from "Nuevo Pago" must create or renew the member's `License` and `Insurance` entities, as the Redsys webhook already does, so the member stops showing "Sin licencia" after paying.

## Context

- Root cause: only [`process_redsys_webhook_use_case.py`](../../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py) (`_generate_licenses_and_insurance`) calls the generators. [`register_manual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/register_manual_payment_use_case.py) has no licence or insurance repository.
- Reported case: Musubi Aikido Murcia, member `6a26cb12878bd7470c42768f`, cash payment `6a2e64da313457bd62521449` (`licencia_kyu`, 2026) with no licence.
- Generators: [`generate_licenses_from_payment_use_case.py`](../../../backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py) (`payment_year`) and [`generate_insurance_from_payment_use_case.py`](../../../backend/src/application/use_cases/insurance/generate_insurance_from_payment_use_case.py) (`paid_at` decides the season).
- Wiring: [`dependencies.py`](../../../backend/src/infrastructure/web/dependencies.py) `get_register_manual_payment_use_case`.
- Frontend: [`usePaymentAdminMutations.ts`](../../../frontend/src/features/club-payments/hooks/mutations/usePaymentAdminMutations.ts) `invalidatePayments` only invalidates `club-payments` and `member-payments`.
- Docs: [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md).

### Real data matrix

Production holds a single completed manual payment (kyu licence, member without a previous licence). The test cases cover every variety "Nuevo Pago" can submit:

| Case | Expected |
|---|---|
| Kyu, member without licence | creates `LIC-{year}-NNNN` |
| Kyu / Dan, member with previous licence | renews it (`last_payment_id`) |
| Seguro accidentes / RC | creates the season insurance |
| Fukushidoin / Shidoin without explicit RC | licence + implicit RC insurance |
| Title + explicit RC | no duplicated RC |
| Club fee only | nothing generated |
| Generation fails | payment still recorded |

## Phases

### Phase 1: manual payment generates licences and insurance

Extract the webhook's generation into a shared use case, call it from the manual payment, and refresh the members, licences and insurance queries in the admin.

Public contracts:

- New `GenerateLicensesAndInsuranceFromPaymentUseCase(license_repository, insurance_repository).execute(member_payments, payment_id, payment_year, paid_at) -> None`.
- `ProcessRedsysWebhookUseCase` delegates to it; `_generate_licenses_and_insurance` and `INSTRUCTOR_TYPES_WITH_RC` are removed.
- `RegisterManualPaymentUseCase.__init__` gains `license_repository` and `insurance_repository`.
- Test suites:
  - New `test_generate_licenses_and_insurance_from_payment_use_case.py`: the matrix rows.
  - `test_register_manual_payment_use_case.py`: `test_licence_payment_generates_member_licence`, `test_insurance_payment_generates_insurance`, `test_title_payment_generates_implicit_rc_insurance`, `test_generation_failure_does_not_abort_payment`.
  - `usePaymentAdminMutations.test.ts`: "invalidates members, licenses and insurance on success".

To-do:

- [ ] Write the failing tests.
- [ ] Create the shared use case and make the webhook delegate to it.
- [ ] Call it from `RegisterManualPaymentUseCase` with `paid_at = payment.payment_date`.
- [ ] Wire both repositories in `dependencies.py`.
- [ ] Invalidate `members`, `licenses` and `insurance` in `invalidatePayments`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1; after merge and deploy, backfill the licence of member `6a26cb12878bd7470c42768f` (grade `6º Kyu`) from payment `6a2e64da313457bd62521449`.

Paid in cash, licensed at last, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
