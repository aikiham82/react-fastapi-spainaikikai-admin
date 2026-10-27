---
name: "Member search club scope"
description: "A club admin's member search filters by club inside the Mongo query, not in memory after the limit"
created_at: "2026-10-27T14:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Member search club scope

## Goal

A club admin's member search asks MongoDB for their club only, so the result limit applies to their club's members and other clubs' members are never loaded.

## Context

- Found by the security QA of `2026_10_27-list_leftovers`. Latent: the admin web always sends `limit: 0` ([`useMemberContext.tsx`](../../../frontend/src/features/members/hooks/useMemberContext.tsx)), so no user sees fewer results today; every search still loads matching members of every club and drops them in memory.
- The change does not depend on per-club data; no real-data matrix needed.
- Files:
  - [`backend/src/infrastructure/web/routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py) `get_members` (search branch), `search_members`.
  - [`backend/src/application/use_cases/member/search_members_use_case.py`](../../../backend/src/application/use_cases/member/search_members_use_case.py)
  - [`backend/src/application/ports/member_repository.py`](../../../backend/src/application/ports/member_repository.py) `search_by_name`
  - [`backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py) `search_by_name`, `find_by_club_id` (pattern)
  - Tests: [`backend/tests/api/test_members_authorization.py`](../../../backend/tests/api/test_members_authorization.py), [`backend/tests/infrastructure/adapters/repositories/test_mongodb_member_repository.py`](../../../backend/tests/infrastructure/adapters/repositories/test_mongodb_member_repository.py)
- Docs: [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md).

## Phases

### Phase 1: member search filters by club in the query

Description: `club_id` travels from the router to the repository and into the Mongo filter; the in-memory filter goes away. Super admin keeps searching across clubs.

- [ ] Test: "a club admin's search asks the use case for their club only" (both `/members?search=` and `/members/search`).
- [ ] Test: "search_by_name filters by club_id when given".
- [ ] Port and adapter: `search_by_name(name: str, limit: int = 0, club_id: Optional[str] = None)`.
- [ ] Use case: `SearchMembersUseCase.execute(name: str, limit: int = 0, club_id: Optional[str] = None)`.
- [ ] Router: pass the scoped club and drop the in-memory club filter.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Scoped where it belongs, courtesy of 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
