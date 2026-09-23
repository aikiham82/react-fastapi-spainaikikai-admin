---
name: "Allow creating members with an empty DNI"
description: "Skip the DNI uniqueness check in CreateMemberUseCase when the DNI is blank, so a member without DNI no longer collides with every other member without DNI."
created_at: "2026-09-23T00:00:00Z"

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
last_implementation_at: "2026-09-23T00:00:00Z"
has_completed_all_phases: true
---

# Allow creating members with an empty DNI

## Goal

Saving a new member with the DNI field empty returns `409 "Ya existe un miembro con ese DNI"` as soon as another member without DNI exists. The DNI uniqueness check must only apply to non-blank DNIs, as the email check already does.

## Context

- [`create_member_use_case.py`](../../../backend/src/application/use_cases/member/create_member_use_case.py): line 40 calls `find_by_dni(dni)` unconditionally; Mongo `find_one({"dni": ""})` matches any member stored with an empty DNI. The email check right below already skips blank values.
- [`member_dto.py`](../../../backend/src/infrastructure/web/dto/member_dto.py): `MemberCreate.dni` is `Optional[str] = None`; the admin `MemberForm.tsx` sends `""`.
- [`update_member_use_case.py`](../../../backend/src/application/use_cases/member/update_member_use_case.py): no DNI uniqueness check, not affected.
- [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): already guards `find_by_dni` with `if dni`, not affected.
- Test style: [`test_change_member_status_use_case.py`](../../../backend/tests/application/use_cases/member/test_change_member_status_use_case.py) (`MagicMock` repo with `AsyncMock` methods).
- Docs: [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

## Phases

### Phase 1: skip DNI uniqueness when the DNI is blank

Guard the DNI lookup the same way the email lookup is guarded, covered by a new use case test suite.

Public contracts:

- `CreateMemberUseCase.execute`: signature unchanged; a blank, whitespace-only or `None` DNI is no longer checked for uniqueness.
- New test suite `backend/tests/application/use_cases/member/test_create_member_use_case.py`:
  - creates a member with an empty DNI when another member already has an empty DNI
  - skips the DNI lookup for a whitespace-only DNI
  - still raises `MemberAlreadyExistsError` for a duplicate non-empty DNI

To-do:

- [x] Write the test suite and watch the empty-DNI cases fail.
- [x] Guard `find_by_dni` with `if dni and dni.strip()` in `CreateMemberUseCase`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented; ready to merge.

A tiny guard, a big relief, delivered by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
