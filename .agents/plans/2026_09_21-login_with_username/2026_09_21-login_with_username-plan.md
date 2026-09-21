---
name: "login_with_username"
description: "Let clubs recover their password and sign in with their user name, change their own login email, and let a super admin see at a glance which members hold an account"
created_at: "2026-09-21T07:30:00Z"

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

last_implementation_at: "2026-09-21T08:05:00Z"
has_completed_all_phases: false
---

# Login with the user name

## 🎯 Goal

Remove the support ticket entirely: a club that forgets its password types the name it knows, receives the link in whatever mailbox its account holds, and can then correct that address itself. A super admin can also tell at a glance which members hold a login account.

## 👀 Context

### Why this is needed

The previous feature ([`2026_09_20-admin_password_reset_link`](../2026_09_20-admin_password_reset_link/2026_09_20-admin_password_reset_link-plan.md)) let a super admin hand out a reset link, but it keeps support in the loop for every ticket, and finding the account means opening members one by one.

The account a club signs in with carries an email nobody remembers, but it also carries a `username` the club does know: for 49 of the 166 accounts it is the club name, and for the other 117 it is the person's own name. Accepting that name in the reset form sends the link to the account's own mailbox without anyone having to know which address it is.

### Production facts this plan is built on

- 166 accounts. 49 usernames match a club name, 117 are personal names, so the field is "correo o nombre de usuario", never "nombre del club".
- `users.username` is **not unique**: two people hold two accounts each (`ALEJANDRO RIVERO RODRIGUEZ`, `Francisco Jose Infante Ruiz`), same name and different emails, one account linked to a member and one orphan. The reset sends a link to every match, each to its own address, since all of them belong to the same person.
- Four accounts still store an unusable address (`null`, `null@jj`, `null@jk`, `pendiente de admision`). They cannot receive anything, which is why the super-admin panel stays as a fallback.
- The members list loads with `limit: 0`, which the backend reads as "no limit", so all members arrive in one response and a client-side filter is correct.

### Blockers found while researching

- `PasswordResetRequestDTO.email` is `EmailStr`, so a user name is rejected with a 422 before any code runs. Only the web calls this endpoint: `mobile/` uses `/auth/login` and `/users/me` only.
- `MongoDBUserRepository.find_by_username` matches exactly, so `kuki aikikai` and `AIKIDO VALENCIA  (ANTIGUO DOJO SINTAGMA)` with its double space both miss. `find_by_email` already matches case-insensitively through `CASE_INSENSITIVE_COLLATION`.
- The JWT subject is the email (`sub`), so changing your own email invalidates your session on the spot. The endpoint has to answer with a fresh token.
- `/users/me/email` must be registered **before** `/users/{user_id}/email`, or `me` is read as a user id.

### Files to consider

- Password reset: [`backend/src/application/use_cases/password_reset/request_password_reset_use_case.py`](../../../backend/src/application/use_cases/password_reset/request_password_reset_use_case.py), [`backend/src/infrastructure/web/dto/password_reset_dto.py`](../../../backend/src/infrastructure/web/dto/password_reset_dto.py), [`backend/src/infrastructure/adapters/services/email_service.py`](../../../backend/src/infrastructure/adapters/services/email_service.py) (`PASSWORD_RESET_TEMPLATE`, inline Jinja2).
- Users: [`backend/src/application/use_cases/user_use_cases.py`](../../../backend/src/application/use_cases/user_use_cases.py) (`AuthenticateUserUseCase`, `UpdateUserEmailUseCase`), [`backend/src/infrastructure/web/routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py), [`backend/src/infrastructure/adapters/repositories/mongodb_user_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_user_repository.py), [`backend/src/infrastructure/web/security.py`](../../../backend/src/infrastructure/web/security.py).
- Frontend auth: [`frontend/src/features/auth/components/LoginForm.tsx`](../../../frontend/src/features/auth/components/LoginForm.tsx), [`frontend/src/features/auth/data/auth.service.ts`](../../../frontend/src/features/auth/data/auth.service.ts), the forgot-password form under `frontend/src/features/password-reset/`, [`frontend/src/pages/settings.page.tsx`](../../../frontend/src/pages/settings.page.tsx).
- Members list: [`frontend/src/features/members/components/MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx) (desktop table and mobile cards), [`frontend/src/features/members/components/MemberBadges.tsx`](../../../frontend/src/features/members/components/MemberBadges.tsx), [`frontend/src/features/users/`](../../../frontend/src/features/users) from the previous feature.

### Conventions to follow

- [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md) and [`docs/conventions/backend.md`](../../../docs/conventions/backend.md): one public `execute` per use case, Motor only inside `adapters/`.
- [`docs/architecture/frontend-features.md`](../../../docs/architecture/frontend-features.md): everything a feature needs under `src/features/{feature}/`.
- [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md): the badge and its filter are super admin only.
- [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md): unit tests against fakes, a marker on every test, coverage floor 50%.

### Public contracts

**Repository ports**

- `UserRepositoryPort.find_by_username_loose(username: str) -> List[User]`: matches ignoring case and collapsing runs of whitespace, and returns every match because the field is not unique.

**Use cases**

- `FindLoginAccountsUseCase.execute(identifier: str) -> List[User]`: an identifier containing `@` resolves through `find_by_email`, anything else through `find_by_username_loose`.
- `AuthenticateUserUseCase.execute(identifier: str) -> List[User]`: returns every candidate account instead of one, so the web layer can check the password against each.
- `RequestPasswordResetUseCase.execute(identifier: str) -> RequestPasswordResetResult`: resolves accounts through `FindLoginAccountsUseCase` and issues one link per active match, each sent to that account's own email.
- `UpdateUserEmailUseCase`: unchanged, reused by the new self-service endpoint.

**HTTP endpoints**

- `POST /auth/login`: request and response unchanged. Internally the password is checked against every candidate account.
- `POST /auth/password-reset/request`: request becomes `{ "identifier": str }`, replacing `{ "email": EmailStr }`. The response stays the same generic success.
- `PATCH /users/me/email` → 200 `Token`, 400 wrong current password, 409 email already in use. Request DTO `UpdateOwnEmailDTO { email: EmailStr, current_password: str }`. Registered before `/users/{user_id}/email`.
- `PUT /auth/users`: never existed in the backend; the dead frontend caller is deleted.

**Spanish copy**

- Login and forgot-password field: `Correo o nombre de usuario`, placeholder `correo@ejemplo.com o KUKI AIKIKAI`.
- Forgot-password success: `Si existe una cuenta, recibirás un enlace en el correo con el que entras. Revisa tu bandeja de entrada. El enlace caduca en 24 horas.`
- Reset email: `Para entrar usa tu correo {email} o tu nombre de usuario {username}.`
- Settings dialog: `Editar Perfil`, `Correo de acceso`, `Contraseña actual`, `Guardar`, `Correo de acceso actualizado`, `La contraseña actual no es correcta`, `Ese correo ya pertenece a otra cuenta`.
- Members list: badge `Acceso`, filter `Solo con acceso`.

**Test suites**

- `backend/tests/infrastructure/adapters/repositories/test_mongodb_user_repository.py`: loose username matching.
- `backend/tests/application/use_cases/test_find_login_accounts_use_case.py`
- `backend/tests/application/use_cases/password_reset/test_request_password_reset_use_case.py`: first tests for this use case.
- `backend/tests/infrastructure/web/test_user_router.py`: login against duplicated user names.
- `backend/tests/infrastructure/web/test_own_email_router.py`
- `frontend/src/features/users/hooks/__tests__/`, `frontend/src/features/members/components/__tests__/`, `frontend/src/features/auth/components/__tests__/`, `frontend/src/pages/__tests__/`.

## 🪜 Phases

### Phase 1: see who holds an account, from the members list

A super admin opens Socios and every member whose account exists carries an `Acceso` badge, with a switch to show only those. Nothing new is requested or rendered for a club admin. Frontend only: the data comes from `GET /users`, which is already super admin only and already returns `member_id`.

- [x] Write a failing test for a `useMembersWithAccountQuery` hook: it returns the set of member ids holding an account, and it does not fire when the caller is not a super admin.
- [x] Implement the hook in `frontend/src/features/users/hooks/queries/`, reusing `userAccountSchema` and the existing service, with the list endpoint added to `user.service.ts`.
- [x] Write failing component tests: the badge renders for a member with an account and not for one without.
- [x] Add `MemberAccessBadge` next to the existing badges in `MemberBadges.tsx` and render it in both layouts of `MemberList.tsx`.
- [x] Write a failing test for the `Solo con acceso` filter, then add the switch to the filter bar for super admins only. The filtering itself lives in `filterMembersWithAccess`, a pure function, so it is tested without mounting the whole list.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any. Frontend 478 passed, lint 0 errors, build green, backend 732 passed.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: recover and sign in with the user name

Typing `kuki aikikai` in the forgot-password form sends the link to that account's own mailbox, and the email says which address and which name it signs in with. The same identifier works at login. Both comparisons ignore case and repeated whitespace.

- [ ] Write failing adapter tests for `find_by_username_loose`: matches a different case, matches a name with a double space, returns every account sharing a name, returns an empty list when nothing matches.
- [ ] Implement it in `MongoDBUserRepository` with an anchored, escaped, case-insensitive regex built from the whitespace-separated words, and declare it on `UserRepositoryPort`.
- [ ] Write failing tests for `FindLoginAccountsUseCase`, then implement it: `@` routes to the email lookup, anything else to the loose username lookup.
- [ ] Write failing tests for `RequestPasswordResetUseCase` covering: a user name issues one link per matching active account, each to its own email; an email still works; an unknown identifier still answers the same generic success; an inactive account is skipped; the per-account daily limit still applies.
- [ ] Rewrite the use case over `FindLoginAccountsUseCase` and change `PasswordResetRequestDTO` to `{ identifier: str }`.
- [ ] Add the login email and user name to `PASSWORD_RESET_TEMPLATE`, with a test asserting the rendered body carries both.
- [ ] Write failing router tests for login: the correct password succeeds against the second of two accounts sharing a user name, a wrong password still answers 401.
- [ ] Change `AuthenticateUserUseCase` to return every candidate and make the login route verify the password against each.
- [ ] Update the login and forgot-password forms: input type `text`, the new label, placeholder and success copy, and send `identifier`. Update their tests.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: change your own login email

Once inside, a user corrects the address their account signs in with by giving their current password, and stays logged in because the response carries a fresh token.

- [ ] Write failing router tests for `PATCH /users/me/email`: it changes the caller's own email and returns a token that resolves to the same account, a wrong current password answers 400 and changes nothing, an address held by another account answers 409, and an anonymous caller answers 401.
- [ ] Add `UpdateOwnEmailDTO`, the route registered before `/users/{user_id}/email`, verifying the current password with `verify_password` and reusing `UpdateUserEmailUseCase`, then minting a token for the new address.
- [ ] Write failing tests for the settings dialog: it sends the typed address and password, stores the returned token, refreshes `currentUser`, and shows the 400 and 409 messages without losing what was typed.
- [ ] Wire the existing `Editar Perfil` button to the dialog, with its mutation hook under `features/auth/hooks/mutations/`.
- [ ] Delete `authService.updateUser` and the `PUT /auth/users` call, which the backend never implemented.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Support can already see who holds an account. Continue with Phase 2, recovering and signing in with the user name.

A turtle never forgets its own name, and now it wears a badge 🪪 🐢 💨 ([Codely](https://codely.com)'s Turbotuga™)
