---
name: "List leftovers"
description: "Escape user search in Mongo regex, say Caducó el for past expiries, no empty footer in the licence detail"
created_at: "2026-10-27T13:30:00Z"

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
last_implementation_at: "2026-10-27T13:45:00Z"
has_completed_all_phases: false
---

# List leftovers

## Goal

Fix three pre-existing issues found during the deregistered-licences QA: unescaped user search in MongoDB `$regex`, "Caduca el" shown for dates already past, and an empty footer band in the licence detail dialog for read-only roles.

## Context

- Found on 2026-10-27 by the security and UI QA agents of `2026_10_27-deregistered_member_licences`.
- The change does not depend on per-club data; no real-data matrix needed.
- Unescaped search:
  - [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) `get_licenses`, `search` param.
  - [`backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py) `search_by_name` (serves `GET /members?search=` and `GET /members/search?name=`).
  - Existing convention: `find_all_by_email` in the same repository uses `re.escape`.
- Copy and footer: [`frontend/src/features/licenses/components/LicenseList.tsx`](../../../frontend/src/features/licenses/components/LicenseList.tsx); `daysUntil` in [`frontend/src/core/utils/expiry.ts`](../../../frontend/src/core/utils/expiry.ts); footer pattern in [`InsuranceDetailDialog.tsx`](../../../frontend/src/features/insurance/components/InsuranceDetailDialog.tsx).
- Docs: [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md), [`docs/conventions/dates-and-money-use-core-formatters.md`](../../../docs/conventions/dates-and-money-use-core-formatters.md).

## Phases

### Phase 1: search treats the text as text

Description: user search terms are escaped before they reach `$regex`.

- [x] Test: "licence search for a name with regex characters answers 200 and matches the literal text".
- [x] Test: "search_by_name escapes regex characters".
- [x] `re.escape(search)` in `get_licenses`; `re.escape(name)` in `search_by_name`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Caducó el for a past expiry

Description: the licence mobile card says "Caducó el" when the expiry date has passed.

- [ ] Test: "the mobile card says Caducó el for a past expiry and Caduca el for a future one".
- [ ] Branch on `daysUntil(expiry) < 0` in `LicenseList.tsx`.
- [ ] Copy: "Caducó el".
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: no empty footer in the licence detail

Description: the detail dialog renders its footer only when the user can edit or delete.

- [ ] Test: "a read-only role sees the licence detail without an empty footer".
- [ ] Gate `DialogFooter` on `canUpdate || canDelete`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 2.

Three loose ends tied up by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
