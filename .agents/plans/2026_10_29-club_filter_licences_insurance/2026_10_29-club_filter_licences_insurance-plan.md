---
name: "Club filter in licences and insurance"
description: "Give the super admin the Club filter of the members list in the Licencias and Seguros lists"
created_at: "2026-10-29T12:32:20Z"

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
last_implementation_at: "2026-10-29T12:50:00Z"
has_completed_all_phases: false
---

# Club filter in licences and insurance

## Goal

The federation (super admin) asked to filter by club, as the previous version did. The members list already has a super-admin-only "Club" filter; the licences and insurance lists get the same one.

## Context

- Reference implementation: [`MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx) (`useClubContext`, `clubOptions`, `SearchableSelect` `member-club-filter`, `handleClubFilter`, active filter count, `clearFilters`).
- [`members.page.tsx`](../../../frontend/src/pages/members.page.tsx) wraps the list in `ClubProvider`; [`licenses.page.tsx`](../../../frontend/src/pages/licenses.page.tsx) and [`insurance.page.tsx`](../../../frontend/src/pages/insurance.page.tsx) do not, and `useClubContext` throws without it.
- [`LicenseList.tsx`](../../../frontend/src/features/licenses/components/LicenseList.tsx): `LicenseFilters` already has `club_id`.
- [`InsuranceList.tsx`](../../../frontend/src/features/insurance/components/InsuranceList.tsx): `InsuranceFilters` in [`insurance.schema.ts`](../../../frontend/src/features/insurance/data/schemas/insurance.schema.ts) lacks `club_id`.
- Backend already filters by club and forces a club admin to their own club: [`licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) `GET ""`, [`insurances.py`](../../../backend/src/infrastructure/web/routers/insurances.py) `GET ""`. No backend change.
- Docs: [`list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`select-all-option.md`](../../../docs/conventions/select-all-option.md).
- Real data matrix: not needed, the change does not depend on per-club data shapes.
- Out of scope: the insurance backend ignores `status` and `insurance_type`; handled in a separate session.

## Phases

### Phase 1: Club filter in Licencias

Super admin picks a club inside "Filtros" and the licences list shows only that club.

- [x] Wrap `LicensesPage` in `ClubProvider`.
- [x] Add the "Club" `SearchableSelect` (`license-club-filter`) to `LicenseList` for `super_admin` only; send `club_id`, count it as an active filter, clear it with "Quitar filtros".
- [x] Tests in `LicenseList.test.tsx`: `offers a Club filter to the super admin`, `does not offer a Club filter to a club admin`, `filters licences by the chosen club`, `clears the club with Quitar filtros`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Club filter in Seguros

Same filter in the insurance list.

- [ ] Add `club_id` to `InsuranceFilters`.
- [ ] Wrap `InsurancePage` in `ClubProvider`.
- [ ] Add the "Club" `SearchableSelect` (`insurance-club-filter`) to `InsuranceList` for `super_admin` only, same behaviour as Phase 1.
- [ ] Tests in `InsuranceList.test.tsx`: the same four cases.
- [ ] Backend test `test_a_super_admin_lists_the_insurances_of_one_club` in `test_insurances_authorization.py`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### UI copy

"Club", "Todos los clubs", "Buscar club...", "No se encontraron clubs." (same as members).

## Next step

Implement Phase 1: the Club filter in Licencias.

Filters sorted club by club by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)’s mascot)
