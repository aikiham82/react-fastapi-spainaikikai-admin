---
name: "Super admin edits everything"
description: "The super admin can really edit licences, insurances, a member's payments and a member's DNI, with validity driven by dates plus an explicit annulment."
created_at: "2026-10-25T19:30:00Z"

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

last_implementation_at: "2026-10-25T21:15:00Z"
has_completed_all_phases: "false"
---

# Super admin edits everything

## Goal

The federation's super admin can change any licence, insurance, member payment and member data from the screens, and what they save is what is stored. Whether a licence or insurance is in force follows its dates; "Anular" withdraws it whatever its dates say.

## Context

- Request 2026-10-25 (federation, point 6): change any data of any club or member: amounts paid, active/expired, the payments a member has (cuota, seguro accidentes, seguro RC); plus the licence form lacks instructor and age categories.
- Research (four read-only agents) found:
  - Licences: [`LicenseForm.tsx`](../../../frontend/src/features/licenses/components/LicenseForm.tsx) sends `expiry_date`/`dan_grade`, which `LicenseUpdate` ([`license_dto.py`](../../../backend/src/infrastructure/web/dto/license_dto.py)) drops; [`update_license_use_case.py`](../../../backend/src/application/use_cases/license/update_license_use_case.py) `setattr`s raw category strings, which the repository's `.value` breaks (500); no status control; no instructor/age fields.
  - Insurances: [`InsuranceForm.tsx`](../../../frontend/src/features/insurance/components/InsuranceForm.tsx) shows type, company, policy and member but `InsuranceUpdate` ([`insurance_dto.py`](../../../backend/src/infrastructure/web/dto/insurance_dto.py)) drops them; `status` through `setattr` breaks on `.value` (500); `effective_status` derives from `end_date`.
  - Member payments: edit/delete exist in "Transacciones" ([`TransactionsSection.tsx`](../../../frontend/src/features/club-payments/components/TransactionsSection.tsx), [`MemberPaymentEditModal.tsx`](../../../frontend/src/features/club-payments/components/MemberPaymentEditModal.tsx)) at the bottom of the club detail, icon-only, desktop-only table, no year; the member's "Ver pagos" dialog ([`MemberPaymentStatus.tsx`](../../../frontend/src/features/members/components/MemberPaymentStatus.tsx)) is read-only.
  - Members: `MemberUpdate` ([`member_dto.py`](../../../backend/src/infrastructure/web/dto/member_dto.py)) has no `dni`, so editing the DNI is silently dropped.
- Decided with the user: validity follows dates; "Anular" (licence `revoked`, insurance `cancelled`) is the only manual status and "Reactivar" removes it.
- Docs: [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/domain/data-model.md`](../../../docs/domain/data-model.md), [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`docs/domain/unique-optional-fields.md`](../../../docs/domain/unique-optional-fields.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md).

### Real data matrix (production, read-only)

- Licences: status always stored `active`; expiration 2025 (683, already expired), 2026 (515), 2027 (1). Categories: kyu/none/adulto, dan/none/adulto, kyu/none/infantil, dan/shidoin/adulto, dan/fukushidoin/adulto, kyu/shidoin/adulto.
- Insurances: accident and civil_liability, all stored `active`; end 2026-09-30 (season 2025-26, expired today) and 2027-09-30 (season 2026-27, in force).
- Cases per phase: an expired one moved forward reads in force; one in force moved back reads expired; annulled with future dates reads annulled; reactivated reads by its dates.

## Phases

### Phase 1: licences are really edited

- [x] `LicenseUpdate`: `issue_date`, `expiration_date`, `grade`, `technical_grade`/`instructor_category`/`age_category` typed as enums, `annulled: Optional[bool]`.
- [x] `UpdateLicenseUseCase.execute(license_id, **fields)`: stores enums, dates and grade; status is `revoked` when annulled, otherwise follows `expiration_date` (active or expired).
- [x] `LicenseForm`: "Cat. Instructor" and "Cat. Edad" selects on create and edit; edit sends `grade`, `issue_date`, `expiration_date` and the categories; member not editable on edit; "Anular licencia" / "Reactivar licencia" on edit; list badge "Anulada".
- [x] Tests `backend/tests/api/test_licenses_update.py`: `test_a_licence_edit_stores_its_categories`, `test_moving_an_expired_licence_forward_puts_it_in_force`, `test_moving_a_licence_back_expires_it`, `test_an_annulled_licence_stays_annulled_with_future_dates`, `test_a_reactivated_licence_follows_its_dates`, `test_a_club_admin_cannot_edit_a_licence`.
- [x] Tests `frontend/src/features/licenses/components/__tests__/LicenseForm.test.tsx`: `creates a licence with its instructor and age categories`, `edits the expiration date and grade`, `annuls and reactivates a licence`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: insurances are really edited

- [x] `InsuranceUpdate`: `insurance_type`, `insurance_company`, `policy_number`, `start_date`, `end_date`, `coverage_amount`, `annulled: Optional[bool]` (annulling is super admin only, 403 otherwise).
- [x] `UpdateInsuranceUseCase`: stores them with the entity's date checks; status `cancelled` when annulled, otherwise `active` (effective status follows `end_date`).
- [x] `InsuranceForm`: what it shows is what it saves; "Anular seguro" / "Reactivar seguro" for super admin; list badge "Anulado".
- [x] Tests `backend/tests/api/test_insurances_update.py`: `test_an_insurance_edit_stores_type_company_and_policy`, `test_moving_an_expired_insurance_forward_puts_it_in_force`, `test_an_annulled_insurance_stays_annulled_with_future_dates`, `test_a_reactivated_insurance_follows_its_dates`, `test_a_club_admin_cannot_annul_an_insurance`.
- [x] Tests `frontend/src/features/insurance/components/__tests__/InsuranceForm.test.tsx`: `edits type company and policy`, `annuls and reactivates an insurance`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: a member's payments are edited from the member

- [x] `MemberPaymentUpdate` and `UpdateMemberPaymentUseCase` accept `payment_year`; moving to a year where the member already has that type completed answers 409.
- [x] "Ver pagos" dialog: for super admin, each payment line has "Editar" and "Eliminar" (reusing `MemberPaymentEditModal`, now with "Año"), and "Añadir pago" opens the manual payment modal with that member preselected.
- [x] "Transacciones": buttons with text and a card layout on phones.
- [x] Tests `backend/tests/api/test_member_payment_year_edit.py` (real use case; the admin endpoints suite mocks use cases): `test_a_member_payment_moves_to_another_year`, `test_moving_a_member_payment_onto_a_paid_year_is_refused`.
- [x] Tests `frontend/src/features/club-payments/components/__tests__/MemberPaymentLines.test.tsx`: `a super admin edits a payment line from the member`, `a club admin sees the payments read only`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 4: a member's DNI is saved on edit

- [ ] `MemberUpdate.dni`; a DNI another member already has answers 409, per `unique-optional-fields.md`.
- [ ] Tests `backend/tests/api/test_members_update_dni.py`: `test_editing_a_member_saves_the_dni`, `test_a_dni_of_another_member_is_refused`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 4.

Payments within reach of the member, DNI next 💶 → 🥋 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
