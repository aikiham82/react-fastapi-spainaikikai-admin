---
name: "DNI in member, licence and insurance lists"
description: "Show the member's DNI in the Members, Licences and Insurance list screens and let the search box find a member by DNI."
created_at: "2026-10-29T12:00:00Z"

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
last_implementation_at: "2026-10-29T13:00:00Z"
has_completed_all_phases: true
---

# DNI in member, licence and insurance lists

## Goal

The federation admin looks members up by DNI. Show the DNI under the member's name in the Members, Licences and Insurance lists (table and mobile card), and let the search box of the three lists find a member by DNI.

## Context

- [`frontend/src/features/members/components/MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx): mobile card and desktop table; the member already carries `dni` ([`member.schema.ts`](../../../frontend/src/features/members/data/schemas/member.schema.ts)).
- [`frontend/src/features/licenses/components/LicenseList.tsx`](../../../frontend/src/features/licenses/components/LicenseList.tsx) and [`license.schema.ts`](../../../frontend/src/features/licenses/data/schemas/license.schema.ts): rows only carry `member_name`.
- [`frontend/src/features/insurance/components/InsuranceList.tsx`](../../../frontend/src/features/insurance/components/InsuranceList.tsx) and [`insurance.schema.ts`](../../../frontend/src/features/insurance/data/schemas/insurance.schema.ts): search is client-side over `member_name` and `policy_number`.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) and [`insurances.py`](../../../backend/src/infrastructure/web/routers/insurances.py): `_populate_member_names` enriches each row from the `members` collection.
- [`backend/src/infrastructure/adapters/repositories/name_search.py`](../../../backend/src/infrastructure/adapters/repositories/name_search.py): `name_search_filter`, used by the member list search and the licence search.
- Docs: [`list-screens-share-one-pattern.md`](../../../docs/conventions/list-screens-share-one-pattern.md), [`search-terms-are-escaped-and-bounded.md`](../../../docs/security/search-terms-are-escaped-and-bounded.md), [`no-production-data.md`](../../../docs/testing/no-production-data.md).

### Real data matrix (production, read-only, 2026-10-29)

| Case | Members |
|---|---|
| DNI present (up to 12 chars) | 547 |
| DNI empty | 730 |
| DNI longer than 12 chars (23) | 1 |

Test and QA rows: a member with DNI, a member without DNI (nothing rendered, no dash), a long DNI (row does not overflow), a licence whose member no longer exists (no DNI, no crash).

## Phases

### Phase 1: show the DNI in the three lists

The DNI appears under the member's name in the Members, Licences and Insurance lists, desktop and mobile. Nothing is rendered when the member has no DNI.

Public contracts:

- `LicenseResponse.member_dni: Optional[str]` and `InsuranceResponse.member_dni: Optional[str]`, filled by `_populate_member_names` (empty DNI becomes `None`).
- Zod: `member_dni` optional nullable on the licence and insurance schemas.
- Copy: `DNI 12345678Z` under the name.
- Tests:
  - `backend/tests/api/test_licenses_list_member_status.py`: the list returns `member_dni`; `None` when the member has no DNI.
  - `backend/tests/api/test_insurances_list_filters.py`: same for insurances.
  - `MemberList.test.tsx`, `LicenseList.test.tsx`, `InsuranceList.test.tsx`: the DNI is shown; no "DNI" text when empty.

- [x] Write the failing backend and frontend tests.
- [x] Add `member_dni` to both response DTOs and both `_populate_member_names`.
- [x] Add `member_dni` to both Zod schemas.
- [x] Render the DNI under the name in the three lists, table and card.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: search by DNI

Typing a DNI in the search box of any of the three lists finds that member.

Public contracts:

- `name_search_filter(term)`: every typed word may match `first_name`, `last_name` or `dni`, still escaped.
- Insurance client-side search also matches `member_dni`.
- Tests:
  - `backend/tests/infrastructure/adapters/repositories/test_name_search.py`: a DNI term builds a `dni` clause; regex characters stay escaped.
  - `backend/tests/api/test_licenses_search.py`: searching a DNI returns that member's licence.
  - `InsuranceList.test.tsx`: typing a DNI keeps only that member's insurance.

- [x] Write the failing tests.
- [x] Add the `dni` clause to `name_search_filter`.
- [x] Include `member_dni` in the insurance client-side search.
- [x] Update `search-terms-are-escaped-and-bounded.md` to say the member search also matches the DNI.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are implemented; next is review and QA.

Plan looked up by DNI and found by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
