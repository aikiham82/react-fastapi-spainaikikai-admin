---
name: "List filters the backend ignores"
description: "GET /insurances honours insurance_type and status; GET /members honours license_status"
created_at: "2026-10-29T13:45:00Z"

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
last_implementation_at: "2026-10-29T14:00:00Z"
has_completed_all_phases: false
---

# List filters the backend ignores

## 🎯 Goal

The federation reported that the insurance type/status filters and the member "Licencia" filter change nothing. The frontend already sends `insurance_type`, `status` and `license_status`; the backend drops them. Make both list endpoints honour them, using the date-derived status.

## 👀 Context

- [`backend/src/infrastructure/web/routers/insurances.py`](../../../backend/src/infrastructure/web/routers/insurances.py): `get_insurances` only declares `limit`, `offset`, `club_id`, `member_id`.
- [`backend/src/infrastructure/web/routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py): `get_members` has no `license_status`; summaries are built by `_enrich_members_with_summaries`.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py): reference pattern, filters `status` in the router after domain conversion.
- [`backend/src/domain/entities/insurance.py`](../../../backend/src/domain/entities/insurance.py): `Insurance.effective_status`.
- Licence status is date-derived on load (`check_and_update_status` in the Mongo licence repository), so `license_summary.status` is already date-aware.
- Docs: [`docs/domain/validity-follows-dates.md`](../../../docs/domain/validity-follows-dates.md), [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).
- Test patterns: `tests/api/test_insurances_authorization.py`, `tests/api/test_members_authorization.py`.

### Real data matrix (production, read-only, 2026-10-29)

| Collection | Type | Stored status | By date | Count |
|---|---|---|---|---|
| insurances | accident | active | in force | 68 |
| insurances | accident | active | expired | 448 |
| insurances | civil_liability | active | in force | 4 |
| insurances | civil_liability | active | expired | 436 |
| licenses | - | active | in force | 522 |
| licenses | - | active | expired | 682 |

Every record is stored `active`, so a filter on the stored field would never return "expired". Each row is a test case; members without a licence are an extra case.

## 🪜 Phases

### Phase 1: insurance type and status filters

Description: `GET /api/v1/insurances` accepts optional `insurance_type: InsuranceType` and `status: InsuranceStatus` (matched against `effective_status`); `total` counts the filtered items.

- [x] Test suite `tests/api/test_insurances_list_filters.py`:
  - [x] only accident insurances for `insurance_type=accident`
  - [x] only RC insurances for `insurance_type=civil_liability`
  - [x] `status=active` excludes an insurance stored active whose end date passed
  - [x] `status=expired` returns that insurance
  - [x] type and status combine
  - [x] `total` equals the filtered count
  - [x] no params returns everything
- [x] Add both query params to `get_insurances` and filter after the use case.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: member licence status filter

Description: `GET /api/v1/members` accepts optional `license_status: LicenseStatus`, matched against `license_summary.status`; members without a licence are excluded when it is set.

- [ ] Test suite `tests/api/test_members_license_status_filter.py`:
  - [ ] `license_status=active` returns only members with an in-force licence
  - [ ] `license_status=expired` returns a member whose licence is stored active with a past expiration date
  - [ ] a member without a licence is excluded when filtering
  - [ ] no param returns every member
  - [ ] combines with the member `status` filter
- [ ] Add the query param to `get_members` and filter after the summaries are built.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 2.

Filters that finally filter, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
