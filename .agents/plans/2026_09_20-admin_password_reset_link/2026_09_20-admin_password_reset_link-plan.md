---
name: "admin_password_reset_link"
description: "Let a super admin hand out a password reset link and correct the login email of an account, from the member card"
created_at: "2026-09-20T21:20:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5"
    reasoning_effort: "high"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5"
    reasoning_effort: "high"

last_implementation_at: "2026-09-20T21:45:00Z"
has_completed_all_phases: false
---

# Admin password reset link

## 🎯 Goal

Give the super admin a way to unblock a locked-out club: generate a password reset link for any account and read it on screen instead of mailing it, and correct the login email so the self-service reset works next time.

## 👀 Context

### Why the current reset fails

Support tickets say "forgot password does not work". Production data explains it. A club reaches the app through a single `users` document whose `member_id` points at a synthetic `"<Club> (Club Admin)"` member. Three different addresses coexist:

| Source | Kuki Aikikai |
| --- | --- |
| `users.email` (the only one that logs in) | `jcarlosarevalo2@gmail.com` |
| `clubs.email` | `leon.aikikai@gmail.com` |
| `members.email` of the synthetic club admin | `leon.aikikai@gmail.com` |

The club types the address the UI shows them, `RequestPasswordResetUseCase` finds no user, and returns a generic success for anti-enumeration reasons. No mail is ever sent and nothing is logged: `password_reset_tokens` holds no token for that account. The login email is invisible everywhere in the product, so nobody can spot the mismatch.

Scale: 166 accounts, 54 clubs, 1266 members. Four accounts carry an unusable login email (`null`, `null@jj`, `null@jk`, `pendiente de admisión`).

### Blocker to clear first

`MongoDBUserRepository._to_domain` builds a `User`, and `User.__post_init__` raises `ValueError` when the email has no `@`. The four accounts above therefore make `GET /users` fail with a 500 today, and would break every new endpoint that loads them. Format validation already happens at the HTTP boundary (`UserCreate` and `UserUpdate` use `EmailStr`), so the entity keeps the non-empty rule and drops the `@` rule.

### Files to consider

- Password reset vertical: [`backend/src/application/use_cases/password_reset/`](../../../backend/src/application/use_cases/password_reset), [`backend/src/domain/entities/password_reset_token.py`](../../../backend/src/domain/entities/password_reset_token.py), [`backend/src/application/ports/password_reset_token_repository.py`](../../../backend/src/application/ports/password_reset_token_repository.py), [`backend/src/infrastructure/adapters/repositories/mongodb_password_reset_token_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_password_reset_token_repository.py)
- Users: [`backend/src/domain/entities/user.py`](../../../backend/src/domain/entities/user.py), [`backend/src/application/use_cases/user_use_cases.py`](../../../backend/src/application/use_cases/user_use_cases.py), [`backend/src/infrastructure/web/routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py), [`backend/src/infrastructure/web/dto/user_dto.py`](../../../backend/src/infrastructure/web/dto/user_dto.py), [`backend/src/infrastructure/adapters/repositories/mongodb_user_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_user_repository.py)
- Authorization: [`backend/src/infrastructure/web/authorization.py`](../../../backend/src/infrastructure/web/authorization.py) provides `require_super_admin(ctx)`, unused by any endpoint so far
- Wiring: [`backend/src/infrastructure/web/dependencies.py`](../../../backend/src/infrastructure/web/dependencies.py), settings attribute `frontend_base_url`
- Frontend member card: [`frontend/src/features/members/components/MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx), [`frontend/src/features/members/components/MemberForm.tsx`](../../../frontend/src/features/members/components/MemberForm.tsx), [`frontend/src/core/data/apiClient.ts`](../../../frontend/src/core/data/apiClient.ts), [`frontend/src/core/hooks/usePermissions.ts`](../../../frontend/src/core/hooks/usePermissions.ts)
- Tests: [`backend/tests/infrastructure/web/test_user_router.py`](../../../backend/tests/infrastructure/web/test_user_router.py) is the router-test template. The password reset vertical has no tests at all today.

### Conventions to follow

- [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md) and [`docs/conventions/backend.md`](../../../docs/conventions/backend.md): one public `execute` per use case, ports in `application/`, Motor only inside `adapters/`.
- [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md) and [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md): everything the feature needs under `src/features/{feature}/`.
- [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md): two-level roles, every new endpoint gated with `require_super_admin`.
- [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md): unit tests against fakes, every test carries a marker, coverage floor 50%.
- MongoDB stores naive datetimes: `datetime.utcnow()`.

### Public contracts

**Domain entities**

- `User.__post_init__`: stops requiring `@` in the email. Empty email still raises.

**Use cases**

- `GenerateAdminPasswordResetLinkUseCase.execute(user_id: str) -> AdminPasswordResetLinkResult` where the result carries `url`, `email` and `expires_at`. Raises `UserNotFoundError`.
- `GetUserByMemberIdUseCase.execute(member_id: str) -> User`. Raises `UserNotFoundError`.
- `UpdateUserEmailUseCase.execute(user_id: str, email: str) -> User`. Raises `UserNotFoundError` and `EmailAlreadyInUseError`.

**Domain exceptions**

- `EmailAlreadyInUseError`: new, raised when another account already holds the address.

**HTTP endpoints** (all gated with `require_super_admin`)

- `POST /users/{user_id}/password-reset-link` → 200 `AdminPasswordResetLinkResponseDTO { url, email, expires_at }`, 403, 404.
- `GET /users/by-member/{member_id}` → 200 `UserResponse`, 403, 404.
- `PATCH /users/{user_id}/email` → 200 `UserResponse`, 400 invalid, 403, 404, 409 already in use. Request DTO `UpdateUserEmailDTO { email: EmailStr }`.

**MongoDB collections**

- `password_reset_tokens`: unchanged shape, one more document per generated link.

**Spanish copy**

- Section title: `Cuenta de acceso`
- Buttons: `Generar enlace de acceso`, `Copiar enlace`, `Corregir correo de acceso`, `Guardar correo`
- Feedback: `Enlace copiado al portapapeles`, `El enlace caduca en 24 horas`, `Este socio no tiene cuenta de acceso`, `Correo de acceso actualizado`, `Ese correo ya pertenece a otra cuenta`

**Test suites**

- `backend/tests/domain/test_user_entity.py`: legacy email cases.
- `backend/tests/application/use_cases/test_generate_admin_password_reset_link_use_case.py`
- `backend/tests/application/use_cases/test_get_user_by_member_id_use_case.py`
- `backend/tests/application/use_cases/test_update_user_email_use_case.py`
- `backend/tests/infrastructure/web/test_admin_password_reset_link_router.py`
- `backend/tests/infrastructure/web/test_user_email_router.py`
- `frontend/src/features/members/__tests__/` hook and component suites for the access-account block.

## 🪜 Phases

### Phase 1: hand out a reset link through the API

A super admin calls one endpoint with a user id and gets back a working reset URL, its expiry and the login email that account really uses. No mail is sent. Once this ships, a locked-out club can be unblocked from Swagger while the UI is still being built. Accounts whose stored email is unusable are loadable again, so the four broken ones are covered too.

- [x] Write a failing test in `backend/tests/domain/test_user_entity.py` asserting a `User` loads with a legacy email such as `"null"` and still rejects an empty one.
- [x] Drop the `@` requirement from `User.__post_init__`, keeping the non-empty rule. The format check moved into `CreateUserUseCase`, so creating an account still rejects a malformed address.
- [x] Write failing use case tests covering: returns a URL built from `frontend_base_url` plus the new token, invalidates the account's previous tokens, persists the token with the account's own email, returns `expires_at` 24 hours ahead, raises `UserNotFoundError` for an unknown id.
- [x] Implement `GenerateAdminPasswordResetLinkUseCase` reusing `PasswordResetTokenRepositoryPort` and `PasswordResetToken`. Do not touch `EmailServicePort` and do not apply the 5-per-day limit that belongs to the public flow.
- [x] Add `AdminPasswordResetLinkResponseDTO` to `backend/src/infrastructure/web/dto/password_reset_dto.py`.
- [x] Write failing router tests: 200 with the URL for a super admin, 403 for a club admin and for a plain user, 404 for an unknown user.
- [x] Add `POST /users/{user_id}/password-reset-link` to the users router, gated with `require_super_admin`, and wire `get_generate_admin_password_reset_link_use_case` in `dependencies.py`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any. 708 passed, coverage 51.15%.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the access-account block in the member card

The member card gains a super-admin-only "Cuenta de acceso" section showing the login email the account really uses, with a button that generates the link and copies it to the clipboard. Club admins see nothing.

- [ ] Write a failing use case test for `GetUserByMemberIdUseCase`, then implement it over the existing `find_by_member_id` port method.
- [ ] Write failing router tests, then add `GET /users/by-member/{member_id}` gated with `require_super_admin`, returning 404 when the member has no account.
- [ ] Add the users feature data layer on the frontend: Zod schema for the account and the link response, plus the axios service against both endpoints.
- [ ] Add the query hook for the account and the mutation hook for the link, following the members feature naming and the `sonner` toast conventions.
- [ ] Render the block inside `MemberForm`, gated with `usePermissions().isAssociationAdmin()`: login email, generate button, copy-to-clipboard via `navigator.clipboard.writeText`, the empty state for a member with no account, and the 24-hour notice.
- [ ] Write hook and component tests covering: the block is hidden for a club admin, the empty state renders, generating shows the link and copying raises the toast.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: correct the login email

The same block lets the super admin fix the address the account logs in with, so the club's own "forgot password" works from then on. Uniqueness is enforced in the use case because `users.email` carries no unique index.

- [ ] Add `EmailAlreadyInUseError` to the domain exceptions.
- [ ] Write failing use case tests: updates the email, normalises it to lowercase and trimmed, raises `EmailAlreadyInUseError` when another account holds it, accepts the account's own current address unchanged, raises `UserNotFoundError` for an unknown id.
- [ ] Implement `UpdateUserEmailUseCase` over the existing `find_by_email` and `update` port methods.
- [ ] Write failing router tests, then add `PATCH /users/{user_id}/email` gated with `require_super_admin`, mapping `EmailAlreadyInUseError` to 409.
- [ ] Add the mutation hook and make the login email editable in the access-account block, with its tests.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Phase 1 is done and a locked-out club can already be unblocked from Swagger. Continue with Phase 2, the access-account block in the member card.

The API opens the door, the turtle walks through it. 🚪 🐢 💨 ([Codely](https://codely.com)'s Turbotuga™)
