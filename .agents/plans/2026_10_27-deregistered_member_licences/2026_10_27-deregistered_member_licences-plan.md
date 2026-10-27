---
name: "Deregistered member licences"
description: "Licences of members de baja read grey 'De baja', offer no Renovar and are not counted as expired"
created_at: "2026-10-27T12:00:00Z"

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
last_implementation_at: "2026-10-27T12:30:00Z"
has_completed_all_phases: true
---

# Deregistered member licences

## Goal

A licence whose member is de baja (`member.status == "inactive"`) is history, not a problem: show it grey as "De baja", without "Renovar", and leave it out of the expired/expiring chips and the red counter on the Club menu.

## Context

- Reported on Musubi Aikido Murcia: 6 licences read red "Caducada" with "Renovar 2027". All 6 belong to inactive members with no payments; the 10 active members all hold a 2026 licence.
- Root cause: the licence list carries no member status, so `getUrgency` treats every past expiry as urgent. The dashboard `expired_licenses` count (Club menu badge) has the same blind spot.
- Real data matrix (production, all licences):

| Member | Licence | Count | Expected |
|---|---|---|---|
| active | expired | 546 | red "Caducada" + Renovar |
| active | in force | 470 | unchanged |
| inactive | expired | 130 | grey "De baja", no Renovar, not counted |
| inactive | in force | 46 | grey "De baja", no Renovar, not counted |
| missing (orphan) | any | 11 | unchanged |

- Files:
  - [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) `_populate_member_names`
  - [`backend/src/infrastructure/web/dto/license_dto.py`](../../../backend/src/infrastructure/web/dto/license_dto.py) `LicenseResponse`
  - [`backend/src/infrastructure/web/routers/dashboard.py`](../../../backend/src/infrastructure/web/routers/dashboard.py) `expired_licenses_count`, expiring list
  - [`frontend/src/features/licenses/utils/licenseStatus.ts`](../../../frontend/src/features/licenses/utils/licenseStatus.ts)
  - [`frontend/src/features/licenses/data/schemas/license.schema.ts`](../../../frontend/src/features/licenses/data/schemas/license.schema.ts)
  - [`frontend/src/features/licenses/components/__tests__/LicenseList.test.tsx`](../../../frontend/src/features/licenses/components/__tests__/LicenseList.test.tsx)
- Docs: [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/conventions/list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

## Phases

### Phase 1: the licence list tells deregistered members apart

Description: the list response carries the member's status and the screen renders deregistered members' licences grey, without Renovar, outside the chips.

- [x] Test (backend, `tests/api/test_licenses_list_member_status.py`): "list returns member_status of each licence's member".
- [x] `LicenseResponse.member_status: Optional[str]`, filled in `_populate_member_names` from the member document it already reads.
- [x] Tests (frontend, `LicenseList.test.tsx`): "a deregistered member's expired licence reads De baja without Renovar"; "chips do not count deregistered members".
- [x] `License.member_status?: string`; `getUrgency` returns `'other'` for `member_status === 'inactive'`; `getStatusPresentation` returns `{ tone: 'neutral', label: 'De baja' }`.
- [x] Copy: "De baja".
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the Club menu counter ignores deregistered members

Description: `expired_licenses` and the expiring-licences list on the dashboard only count licences of active members.

- [x] Test (`tests/api/test_dashboard_licences.py`): "expired count ignores licences of inactive members".
- [x] Restrict both queries in `dashboard.py` to `active_member_ids`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented.

Less red, more truth, brought to you by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
