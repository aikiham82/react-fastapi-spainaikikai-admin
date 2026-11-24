---
name: "Member status board"
description: "Super-admin screen listing every member with licence paid, member status, licence and insurance validity, a paid checkbox and an Excel download"
created_at: "2026-11-24T09:35:46Z"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

last_implementation_at: "2026-11-24T10:45:00Z"
has_completed_all_phases: "false"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Member status board

## 🎯 Goal

Give the federation secretary one screen, "Estado de socios", with every member of every club: licence of the year paid, member active or deregistered, licence in force, accident and RC insurance in force. Ticking "paid" registers a manual payment, unticking removes that line, and the screen downloads as Excel.

## 👀 Context

Request from Guille (secretary) on 2026-11-23. Per member, "cuota anual" means the licence of the year paid; the club fee is not on this screen.

Rules that shape the design:

- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md): paid derives only from completed `MemberPayment` lines; a title includes the RC; insurances are read by the season in force today.
- [`docs/domain/validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md): in force/expired comes from dates, never from a stored status a checkbox could set.
- [`docs/domain/a-payment-is-fulfilled-once.md`](../../../docs/domain/a-payment-is-fulfilled-once.md): the manual payment refuses lines already paid.
- [`docs/conventions/list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`docs/conventions/navigation-groups-and-tabs.md`](../../../docs/conventions/navigation-groups-and-tabs.md), [`docs/conventions/dates-and-money-use-core-formatters.md`](../../../docs/conventions/dates-and-money-use-core-formatters.md).
- [`docs/security/sentry-collects-no-personal-data.md`](../../../docs/security/sentry-collects-no-personal-data.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

Code to reuse:

- [`members.py`](../../../backend/src/infrastructure/web/routers/members.py): `_build_license_summary`, `_build_insurance_summary`, bulk enrichment helpers.
- [`completed_member_payments.py`](../../../backend/src/application/use_cases/payment/completed_member_payments.py): `find_completed_member_payments`.
- [`member_payment.py`](../../../backend/src/domain/entities/member_payment.py): `is_license_payment`.
- [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): `_build_excel`, `_split_last_name`.
- [`ManualPaymentModal.tsx`](../../../frontend/src/features/club-payments/components/ManualPaymentModal.tsx): already used for a single member by `MemberPaymentLines.tsx`.
- `DELETE /member-payments/{id}` ([`member_payments.py`](../../../backend/src/infrastructure/web/routers/member_payments.py)): removes one line and recomputes the parent amount. It does not remove the licence the line created, so an unticked member keeps a licence in force shown as "Sin pagar".
- [`MemberBadges.tsx`](../../../frontend/src/features/members/components/MemberBadges.tsx), [`navigation.ts`](../../../frontend/src/components/navigation.ts), [`App.tsx`](../../../frontend/src/App.tsx).

Real data matrix (production, read-only, 2026-11-24). Each row is a test case and a QA row:

| Variety | Production count |
|---|---|
| Active member / deregistered member | 1055 / 237 |
| Licence 2026 paid as Kyu / Kyu infantil / Dan | 201 / 52 / 63 |
| Licence 2026 paid as a title (Shidoin, Fukushidoin), RC covered by the title | 22 |
| Licence in force with no 2026 licence payment (amber "Sin pagar") | 226 |
| Payments of 2027 already present (licences / insurances) | 68 / 120 |
| Member without any licence, member without insurance | present |

## 🪜 Phases

### Phase 1: read-only board

A super admin opens Admin › "Estado de socios" and sees every member with their state for a chosen year.

- [x] Rows built by `member_status_rows(...)` in the members router, reusing the router's bulk summary helpers (members, clubs, licences, insurances, completed lines of the year) instead of a new use case: the summaries already live there.
- [x] `MemberStatusRow`: `member_id`, `first_name`, `last_name`, `club_id`, `club_name`, `member_status`, `license_summary`, `insurance_summary`, `license_paid: bool`, `license_payment_id: Optional[str]` (the completed licence or title line of that year).
- [x] Endpoint `GET /api/v1/members/status-board?payment_year=N`, super admin only (403 otherwise), response `List[MemberStatusRowResponse]`.
- [x] Test suite `tests/api/test_member_status_board.py`: paid kyu / kyu infantil / dan, paid title, licence in force without payment, no licence, deregistered member, insurance accident only, RC covered by title, a 2027 payment does not mark 2026 paid.
- [x] Router test: super admin 200, club admin 403.
- [x] Frontend feature `member-status-board`: types, service, `useMemberStatusBoardQuery(year)`, `MemberStatusBoard` page with year selector, search, club filter, table (Miembro, Club, Licencia {año} pagada, Miembro, Licencia, Accidentes, RC) and mobile cards.
- [x] Copy: tab "Estado de socios"; paid "Pagada" / "Sin pagar"; amber "Sin pagar" next to a licence in force without payment; member "Activo" / "De baja".
- [x] Route `/member-status` gated `super_admin`, tab in the `admin` nav group.
- [x] Component tests for `MemberStatusBoard`: renders rows, amber when in force without payment, filters by search.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: paid checkbox

- [ ] Ticking "Licencia {año} pagada" opens `ManualPaymentModal` for that single member, club and year; on success the board refetches.
- [ ] Unticking asks "¿Quitar el pago de la licencia {año} de {nombre}?" and calls `DELETE /member-payments/{license_payment_id}`; on success the board refetches.
- [ ] Component tests: tick opens the modal with the member, untick confirms and calls the delete mutation, the checkbox is disabled while a request is in flight.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: Excel download

- [ ] Endpoint `GET /api/v1/import-export/members/status-board/export?payment_year=N`, super admin only, built with `_build_excel` from the same use case. Columns: Nombre, 1er Apellido, 2do Apellido, Club, Licencia {año} pagada (Sí/No), Miembro (Activo/De baja), Licencia (Vigente/Caducada/Sin licencia), Accidentes, RC (Vigente/Caducado/Sin seguro).
- [ ] Router test: super admin gets an xlsx with those headers and one row per member, club admin 403.
- [ ] "Descargar Excel" button on the board, downloading `estado_socios_{año}_{fecha}.xlsx`.
- [ ] Component test: the button calls the export service with the selected year.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 2: the paid checkbox.

Every member in one glance, brought by 👀 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
