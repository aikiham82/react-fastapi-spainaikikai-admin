---
name: "Drop the club email"
description: "The club record's email no longer signs in nor receives anything; stop asking for and showing it, keep stored values."
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

# Drop the club email

## 🎯 Goal

The club record's email is a leftover of the old shared club login: nothing sends to it and nobody signs in with it, and next to the account email it confuses. Stop requiring and showing it; keep the stored values untouched.

## 👀 Context

- Required in [`club.py`](../../../backend/src/domain/entities/club.py) (`__post_init__`, also on load), [`club_dto.py`](../../../backend/src/infrastructure/web/dto/club_dto.py) (`ClubBase.email: EmailStr`), [`create_club_use_case.py`](../../../backend/src/application/use_cases/club/create_club_use_case.py).
- Shown in [`ClubForm.tsx`](../../../frontend/src/features/clubs/components/ClubForm.tsx) ("Email *") and [`MyClub.tsx`](../../../frontend/src/features/clubs/components/MyClub.tsx) ("Correo").
- No Excel import or export reads it. Does not depend on per-club data: the 43 clubs all have one and keep it.
- Related: [`club-accounts-pass-to-a-person.md`](../../../docs/domain/club-accounts-pass-to-a-person.md).

## 🪜 Phases

### Phase 1: the club email is neither asked for nor shown

Public contracts:

- Domain: `Club.email` optional, no validation.
- HTTP: `email` optional in `ClubCreate`, `ClubUpdate`, `ClubResponse`; an edit without it keeps the stored value.
- Use case: `CreateClubUseCase.execute(..., email: str = "")`.
- Admin copy: no "Email" field in the club form, no "Correo" row in "Mi club".
- Tests: entity (club without email valid); API (create without email 201, edit keeps stored email); vitest (form without email field saves; Mi club without "Correo").

- [x] Write the failing tests.
- [x] Make the email optional in entity, DTOs and use case.
- [x] Remove the field and the row from the admin.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are implemented: review, QA and merge.

One field fewer to confuse: ✉️ ❌ 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
