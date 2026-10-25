---
name: "Club admin manages member access"
description: "Let a club admin (and the super admin) give, manage and remove web access for the members of their own club, so the federation stops doing it by hand"
created_at: "2026-10-25T20:30:00Z"

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

last_implementation_at: "2026-10-25T21:15:00Z"
has_completed_all_phases: false
---

# Club admin manages member access

## Context

The project exists to take club management off the federation's hands. Today a club has, in practice, one login: nothing in `backend/src` links a `users` document to a member (`User.link_to_member` has no callers; only seed and migration scripts set `users.member_id`). Giving a second person access, or fixing who can sign in, always ends with the federation's super admin or a manual database change. Real case: a club needs its new manager and its previous one to sign in with their own addresses.

The account support panel (`frontend/src/features/users/components/MemberAccessAccount.tsx`) and its three routes (`GET /users/by-member/{member_id}`, `PATCH /users/{user_id}/email`, `POST /users/{user_id}/password-reset-link`) are guarded with `require_super_admin`.

Authorisation follows the members router pattern: `require_club_admin_ctx(ctx)`, load the member, `_require_access_to_club(ctx, member.club_id)`. A club admin is a user whose linked member has `club_role == admin` (`AuthContext.is_club_admin`).

### Real data matrix (production, read only, 1,276 members)

| Case | Members | Expected behaviour |
|---|---|---|
| No email, no account | 861 | The form starts empty; an email must be typed |
| Email free, no account | 54 | The form is prefilled with the member's email |
| Email already used by another account (family or club address), no account | 214 | 409, "Ese correo ya lo usa otra cuenta" |
| Already has an account | 147 | Account panel; no "Dar acceso" form |

Limits: the caller's own member; a member of another club; the super admin's account; the last admin of a club; an inactive account being given access again.

## Phase 1: Give web access to a member

A club admin or the super admin opens a member without an account, types or confirms an email, optionally ticks "Puede gestionar el club", and the member receives an email to set their password. The link can also be copied.

- [x] Write failing tests for `GrantMemberAccessUseCase` (`backend/tests/application/use_cases/user/test_grant_member_access_use_case.py`): creates a user linked to the member with the email lowercased as email and username; promotes the member when asked and only then; issues a 24 h token and emails it; refuses a member that already has an account; refuses an email used by another account; refuses an unknown member.
- [x] Implement `GrantMemberAccessUseCase.execute(member_id, email, make_club_admin, issued_by) -> AdminPasswordResetLink` with an unusable random password, and `EmailServicePort.send_account_invitation_email(to_email, member_name, url) -> bool` plus the adapter.
- [x] Write failing router tests (`backend/tests/api/test_member_account_router.py`): super admin grants for any club; club admin grants for their club; club admin gets 403 for another club; 409 for both conflicts; a plain member gets 403.
- [x] Add `POST /api/v1/members/{member_id}/account` with `GrantMemberAccessDTO { email: EmailStr, club_admin: bool = false }`, answering `201 AdminPasswordResetLinkResponseDTO`.
- [x] Frontend: in `MemberAccessAccount`, when the member has no account, render the grant form for super admins and club admins; Zod schema, service, `useGrantMemberAccessMutation`; tests for the prefilled email, the 409 message and the success state.
- [x] Spanish copy: button "Dar acceso a la web", checkbox "Puede gestionar el club (pagos, altas y consultas)", success "Le hemos enviado un correo a {email} para que ponga su contraseña", email subject "Tu acceso a Spain Aikikai Admin".
- [x] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [x] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Phase 2: Club admins use the account panel for their own club

- [ ] Write failing router tests: a club admin can read the account of a member of their club, correct its email and issue a link; gets 403 for another club's member; gets 403 on the super admin's account.
- [ ] Relax the three routes from `require_super_admin` to "super admin, or club admin of the linked member's club, never on a super admin account".
- [ ] Frontend: show `MemberAccessAccount` to club admins; update its tests.
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Phase 3: Change who manages the club and remove access

- [ ] Write failing tests for `SetMemberClubRoleUseCase.execute(member_id, club_role)`: promotes and demotes; refuses to demote the club's last admin.
- [ ] Write failing tests for `RevokeMemberAccessUseCase.execute(member_id, revoked_by_member_id)`: deactivates the linked user, invalidates its tokens and demotes the member; refuses the caller's own member; refuses a super admin account. `GrantMemberAccessUseCase` reactivates an inactive linked account instead of answering 409.
- [ ] Add `PATCH /api/v1/members/{member_id}/club-role` (`{ club_role: "admin" | "member" }`) and `DELETE /api/v1/members/{member_id}/account`, with the same guards as phase 1, and their router tests.
- [ ] Frontend: in the account panel, a "Puede gestionar el club" switch and a "Quitar acceso" button with confirmation; tests.
- [ ] Spanish copy: "Quitar acceso", "¿Quitar el acceso a {nombre}? No podrá entrar en la web.", "El club tiene que tener al menos un responsable".
- [ ] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Out of scope

- `PUT /members/{id}` passes `club_role` as a raw string to the entity, which most likely fails on save. Pre-existing; its own branch.

## Next step

Phase 2.

Plan powered by [Codely](https://codely.com) 🐢 🔑
