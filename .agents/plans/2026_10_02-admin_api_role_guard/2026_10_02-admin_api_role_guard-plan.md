---
name: "Admin API role guard"
description: "Refuse the administration API to callers who administer nothing, and hold club admins to their own club on the member endpoints."
created_at: "2026-10-02T00:00:00Z"

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

last_implementation_at: "2026-10-02T00:00:00Z"
has_completed_all_phases: "false"
---

# Admin API role guard

## 🎯 Goal

Only a super admin or a club admin may call the administration API. A freshly self-registered account, or a plain member, must receive `403` everywhere except the endpoints meant for them. On the member endpoints a club admin is held to their own club.

## 👀 Context

Root cause, established with systematic debugging and reproduced on a local instance: a user with no linked member has no club, and the code reads "no club" as "no filter", the same as for a super admin. Almost no router requires a role. An account created through the public `POST /api/v1/auth/register` got `200` on `GET /members` with every member of every club, including DNI, email, phone, address and birth date, and `200` on `/licenses`, `/payments`, `/clubs` and `/member-payments/member/{id}`.

- [`backend/src/infrastructure/web/authorization.py`](../../../backend/src/infrastructure/web/authorization.py): `get_club_filter_ctx` returns `None` both for a super admin and for a user with no member; `check_club_access_ctx` accepts any caller whose club matches, admin or not.
- [`backend/src/infrastructure/web/dependencies.py`](../../../backend/src/infrastructure/web/dependencies.py): `get_auth_context`.
- [`backend/src/app.py`](../../../backend/src/app.py): routers are included with no shared dependency.
- [`backend/src/infrastructure/web/routers/members.py`](../../../backend/src/infrastructure/web/routers/members.py): eight handlers gated with `if member.club_id: check_club_access_ctx(...) elif ctx.is_club_admin: raise`, and `/search` declared after `/{member_id}`.
- [`backend/src/infrastructure/web/routers/payments.py`](../../../backend/src/infrastructure/web/routers/payments.py): holds the Redsys webhook, which is called without a token and must stay public.
- [`backend/src/infrastructure/web/routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py): `GET /users/{user_id}` returns any account to any authenticated caller.
- [`backend/src/infrastructure/web/routers/insurances.py`](../../../backend/src/infrastructure/web/routers/insurances.py) and [`backend/tests/api/test_insurances_authorization.py`](../../../backend/tests/api/test_insurances_authorization.py): the pattern and the test shape already merged for insurances.

Findings that shape the plan:

- The mobile app calls no `/api/v1` endpoint, so guarding the routers breaks no member-facing client.
- A plain member reads their own data through `GET /users/me`, which stays open to any authenticated user.
- Self-registration stays open by the user's decision. After Phase 1 such an account can reach nothing but its own profile.

Decisions taken with the user:

- Two phases. Cross-club limits for club admins on invoices, payments and licences are a follow-up branch.
- Production is not probed. Verification after deploy uses an account the user names.

Documentation to follow:

- [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md): never gate on one level alone.
- [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md) and [`docs/security/auth-endpoints.md`](../../../docs/security/auth-endpoints.md).
- [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md) and [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

## 🪜 Phases

### Phase 1: the administration API requires an admin

Every administration router refuses a caller who is neither super admin nor club admin, in one place, so a router added later is covered by the same rule and by the same test.

Public contracts:

- Dependency: new `require_admin_access(ctx) -> AuthContext` in `infrastructure/web/dependencies.py`, raising `403` unless the caller is a super admin or a club admin.
- HTTP: `app.py` includes the clubs, members, licences, seminars, payments, insurances, dashboard, import-export, price-configurations, invoices and member-payments routers with that dependency. Paths, parameters and bodies are unchanged; the only new response is `403`.
- HTTP: the Redsys webhook `POST /api/v1/payments/webhook` moves to a `public_router` in `routers/payments.py` and stays callable without a token.
- HTTP: `GET /api/v1/users/{user_id}` answers `403` unless the caller is a super admin or asks for their own account.
- HTTP, unchanged and open to any authenticated user: `GET /users/me`, `PATCH /users/me/email`. Unchanged and public: register, login, password reset, the webhook.
- Test suite `tests/api/test_admin_api_requires_admin.py` (new), built on the real `create_app()`:
  - every route outside the explicit open list answers `403` to a plain member;
  - every route outside the explicit open list answers `403` to a user with no linked member;
  - the open list contains only routes that exist;
  - a club admin is not refused by the guard on a representative route of each guarded router;
  - the Redsys webhook is reachable without a token;
  - a plain member reads their own account by id and is refused another one.
- Documentation: `docs/domain/roles-and-permissions.md` and `docs/security/security-guidelines.md` state the rule and where it is enforced.

To-do:

- [x] Write the failing tests listed above.
- [x] Add `require_admin_access` and apply it when including the administration routers.
- [x] Move the Redsys webhook to `public_router` and include it without the guard.
- [x] Restrict `GET /users/{user_id}` to a super admin or the account itself.
- [x] Update the two documents.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: member endpoints hold a club admin to their club

The member router stops deciding access handler by handler with a branch that only covers club admins.

Public contracts:

- HTTP: on `GET /members/{id}`, `PUT /members/{id}`, `PATCH /members/{id}/status` and `DELETE /members/{id}`, a club admin gets `403` for a member of another club or with no club; a super admin is unrestricted.
- HTTP: `GET /members` and `GET /members/search` return only the caller's club to a club admin, whatever `club_id` they send. `GET /members/search` is declared before `GET /members/{member_id}` so it is reachable.
- HTTP: `POST /members` creates in the caller's club for a club admin and refuses another club.
- Spanish copy, unchanged: "No tienes acceso a este miembro", "No puedes crear un miembro en otro club", "No puedes transferir un miembro a otro club".
- Test suite `tests/api/test_members_authorization.py` (new): the four callers (super admin, club admin, plain member, user with no member) against the eight endpoints; a club admin is refused a member of another club and a member with no club; a club admin's list and search are scoped to their club; `/members/search` is reachable.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Replace the per-handler branches with one helper that requires a super admin, or a club admin of the member's club.
- [ ] Scope list and search for club admins, and declare `/search` before `/{member_id}`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 2, member endpoints hold a club admin to their club.

The door now checks belts before anyone steps on the mat: 🚪 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
