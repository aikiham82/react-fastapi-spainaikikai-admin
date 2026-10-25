---
name: "Minor follow-ups of the club reports"
description: "List counts instead of a broken pager, annul toasts, Spanish duplicate message, dashboard licence widgets per club, titles counting as RC, and moving a payment line's year moves what it generated."
created_at: "2026-10-25T22:00:00Z"

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

last_implementation_at: "2026-10-25T22:40:00Z"
has_completed_all_phases: "false"
---

# Minor follow-ups of the club reports

## Goal

Close the small defects left after the 2026-10-25 club reports: the lists' pager, the annul toasts, the duplicate payment message, the dashboard licence widgets for club admins, titles that include RC, and the licence or insurance left behind when a payment line moves year.

## Context

- Pager: the licence, member and insurance contexts send `limit: 0` (all rows), so `LicenseList.tsx`, `MemberList.tsx` and `InsuranceList.tsx` compute `NaN`/`Infinity`.
- Toasts: `useLicenseMutations.ts` and `useInsuranceMutations.ts` always say "actualizada"; `useMemberMutations.ts` already picks its toast from `variables.data`.
- 409 text: `update_member_payment_use_case.py` prints `target_type.value`; the only Spanish label map is `PAYMENT_TYPE_LABELS` in `routers/import_export.py`.
- Dashboard: `routers/dashboard.py` filters `licenses` by `club_id`, which licences do not have ([`docs/domain/data-model.md`](../../../docs/domain/data-model.md)); `MongoDBLicenseRepository.find_by_club_id` resolves member ids.
- Titles and RC: `process_redsys_webhook_use_case.py` adds a 0 € `seguro_rc` line for each title, `prefill_annual_payment_use_case.py` counts titles as RC; summaries (`get_club_payment_summary`, `get_all_clubs_payment_summary`, `get_member_payment_status`, `get_unpaid_members`) only see real `seguro_*` lines, so a title registered by hand counts no RC.
- Moving year: `UpdateMemberPaymentUseCase` changes only the line. Licences link to the parent payment by `last_payment_id` and expire on 31 December of the year; insurances link by `payment_id` and cover `insurance_season(year)`.
- Out of scope, decided with the user: no unique index on `members.dni`. Production has 9 shared DNIs: 4 are the same person registered twice (listed for the club), 5 are different people sharing one (children with a parent's DNI).
- Docs: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md), [`update-use-cases-take-named-fields.md`](../../../docs/conventions/update-use-cases-take-named-fields.md).

### Real data matrix

Licence lines: licencia_kyu, licencia_kyu_infantil, licencia_dan, titulo_fukushidoin, titulo_shidoin. Insurance lines: seguro_accidentes, seguro_rc. Titles paid through Redsys (with a 0 € RC line) and registered by hand (without one). A club admin's dashboard for a club whose licences are expired, expiring and renewed.

## Phases

### Phase 1: list counts and annul toasts

- [x] Licencias, Miembros and Seguros show "N licencias / miembros / seguros" instead of the pager when every row is loaded.
- [x] Annulling shows "Licencia anulada" / "Licencia reactivada" and "Seguro anulado" / "Seguro reactivado".
- [x] Tests (shared ListPager and updateToast, used by the three lists and both mutations): `shows the count instead of a pager when every row is loaded`, `pages when the rows come in pages`, `shows nothing for an empty list`; `toasts an annulment and a reactivation`, `toasts a plain edit as an update`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Spanish duplicate message and dashboard licences per club

- [x] `PAYMENT_TYPE_LABELS` moves to `domain/entities/member_payment.py`; the 409 reads "Este miembro ya tiene Seguro de Accidentes en 2027".
- [x] Dashboard licence widgets filter by the club's member ids.
- [x] Tests: the duplicate message assertion in `test_member_payment_year_edit.py` now expects the Spanish label; `test_a_club_admin_dashboard_counts_its_club_licences`, `test_expired_licences_are_counted_by_their_date` (expired licences were counted by a stored status that production never sets).
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: a title counts as RC paid

- [ ] One domain rule: a completed `titulo_*` line covers `seguro_rc` for its member and year; used by the four summaries and by prefill.
- [ ] Tests: `test_a_title_registered_by_hand_counts_as_rc_paid` (club summary, member status, unpaid RC); `test_a_title_with_its_redsys_rc_line_is_counted_once`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 4: moving a line's year moves what it generated

- [ ] When a licence or title line moves year, the member's licence linked to that payment covers 1 January to 31 December of the new year; when an insurance line moves, the member's insurance of that type linked to that payment covers `insurance_season(new year)`.
- [ ] Tests: `test_moving_a_licence_line_moves_its_licence`, `test_moving_an_insurance_line_moves_its_insurance`, `test_moving_a_line_without_a_generated_record_changes_only_the_line`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 3.

Spanish on the outside, clubs counted right 🇪🇸 🧹 → 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
