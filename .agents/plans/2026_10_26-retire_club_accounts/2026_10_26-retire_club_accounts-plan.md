---
name: "Retire club accounts"
description: "The card app refuses the shared club accounts left by the MariaDB migration, and a super admin moves each one onto the club's shidoin or fukushidoin so nobody loses access."
created_at: "2026-10-26T21:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Retire club accounts

## 🎯 Goal

A club account (a user linked to the synthetic `"<Club> (Club Admin)"` member) cannot enter the card app, which shows why and links to the admin web. A super admin moves each club account onto a real person, proposed as the club's shidoin or fukushidoin, keeping its email, username and password, so the person keeps entering the panel and the app exactly as before and now sees their own card.

## 👀 Context

- Origin: [`backend/scripts/migrate_from_mariadb.py`](../../../backend/scripts/migrate_from_mariadb.py) (~516-552) created one synthetic member per old club login: `last_name="(Club Admin)"`, `club_role=admin`, no licence. The user's `member_id` points to it.
- Incident 2026-10-26 (Kuki Aikikai): the card app showed "Sin licencia vigente" to a shidoin entering with the club account. Fixed by hand in production by relinking the user to his own member.
- Login and `/users/me`: [`routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py) (`/auth/login` 109-158, `/users/me` 161-169), DTO [`user_dto.py`](../../../backend/src/infrastructure/web/dto/user_dto.py) (`UserMeResponse` 58-61). Club rights come from `AuthContext` ([`authorization.py`](../../../backend/src/infrastructure/web/authorization.py)) through `user.member_id`.
- Member access features: [`member_access/`](../../../backend/src/application/use_cases/member_access/) (grant, club role, revoke). No operation relinks a user to another member today.
- Mobile: login [`mobile/app/login.tsx`](../../../mobile/app/login.tsx), mutation [`useLoginMutation.ts`](../../../mobile/src/features/auth/hooks/mutations/useLoginMutation.ts), session [`useAuth.ts`](../../../mobile/src/features/auth/hooks/useAuth.ts) (restored from storage, `/users/me` not re-checked), [`AdminWebNotice.tsx`](../../../mobile/src/features/auth/components/AdminWebNotice.tsx), URLs [`web-urls.ts`](../../../mobile/src/core/web-urls.ts). The mobile app has no test runner: verification is `npx tsc --noEmit`.
- Docs: [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`docs/domain/club-admins-manage-member-access.md`](../../../docs/domain/club-admins-manage-member-access.md), [`docs/security/auth-endpoints.md`](../../../docs/security/auth-endpoints.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md), [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md).

### Real production varieties (read-only query, 2026-10-26)

| Variety | Count | Test case |
|---|---|---|
| Active club account linked to a placeholder | 39 | blocked in app; listed; transferable |
| Placeholder member with no user | 1 | not listed (nothing to transfer) |
| Club with exactly 1 active shidoin | 15 | one candidate |
| Club with no shidoin and exactly 1 fukushidoin | 4 | one candidate (fukushidoin) |
| Club with 2 or more shidoin | 8 | several candidates |
| Club with neither | 12 | no candidate, transfer from the member card |
| Club with no members at all | 3 | no candidate |
| Chosen person already has an active account of their own | 0 of the single-shidoin clubs | 409, nothing changed |
| Club account linked to a real person already (Kuki, Musubi Murcia, Muzen, Senkikai) | 4+ | not a club account: enters the app, not listed |
| Login by username (e.g. "ONUBA AIKIKAI") as well as by email | both exist | unchanged after transfer |

Sentry (since 2026-10-25) shows two placeholder accounts signing in (Onuba Aikikai, Dojo Heijoshin). Sentry does not tell app from panel; it does not matter, since the transfer keeps the credentials.

## 🪜 Phases

### Phase 1: the card app refuses club accounts

The API flags a club account in `/users/me`; the app refuses to sign it in, and signs out a stored session of one, with a message pointing to the admin web. The panel is unchanged.

Public contracts:

- Domain: `Member.is_club_account_placeholder` property (`last_name == "(Club Admin)"`), the single place that knows the marker.
- HTTP: `GET /api/v1/users/me` response gains `is_club_account: bool`.
- Mobile copy (login screen): title "Esta es la cuenta del club"; body "La app es el carné de cada socio. Para gestionar el club entra en Spain Aikikai Admin con esta cuenta."; button "Abrir Spain Aikikai Admin".
- Tests: `test_user_router.py` - "me flags a user linked to the club placeholder as a club account", "me does not flag a user linked to a real member"; domain unit test for the property.

- [ ] Write the failing backend tests.
- [ ] Add the property on `Member` and `is_club_account` to `UserMeResponse` and `/users/me`.
- [ ] Mobile: `is_club_account` in `UserMeSchema`; the login mutation does not call `signIn` for a club account and the login screen shows the club-account message with the admin web button.
- [ ] Mobile: on app start with a stored session, re-fetch `/users/me` and sign out a club account (so it lands on the message).
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: a super admin moves a club account onto a person

From a member's card, a super admin passes the club's account to that member: same user (email, username, password), now linked to the member, who becomes club admin; the placeholder member is left inactive.

Public contracts:

- Use case: `TransferClubAccountUseCase.execute(club_id: str, member_id: str) -> User` in `application/use_cases/member_access/`.
- HTTP: `POST /api/v1/clubs/{club_id}/account/transfer`, body `{ "member_id": str }`, response `UserResponse`. Errors: 403 not super admin, 404 the club has no club account, 422 the member is not in that club, 409 the member already has an active account.
- MongoDB: no new fields. `users.member_id` changes; the member's `club_role` becomes `admin`; the placeholder `status` becomes `inactive`.
- Admin copy: button "Pasar la cuenta del club a esta persona"; confirmation "La cuenta del club pasará a ser de {nombre}. Seguirá entrando con el mismo correo y contraseña y será administrador del club."; toast "Cuenta del club pasada a {nombre}".
- Tests: use case unit suite (happy path, member of another club, member with an active account, club without a club account); router suite (super admin 200, club admin 403); vitest for the button visibility and the confirmation call.

- [ ] Write the failing tests.
- [ ] Implement the use case, its wiring and the endpoint.
- [ ] Admin: service, mutation and the button with confirmation on the member card, visible only to a super admin when the member's club still has a club account.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: list of clubs still on a club account, with their shidoin or fukushidoin

The super admin sees every club still using a club account, with its shidoin (or, when it has none, its fukushidoin) shown directly in the row and a button per person to pass the account to them.

Public contracts:

- Use case: `ListClubAccountsUseCase.execute() -> list[ClubAccountSummary]` (club id and name, account username and email, candidates: member id, name, instructor category).
- HTTP: `GET /api/v1/clubs/club-accounts` (super admin only) returning that list.
- Admin copy: section "Cuentas de club sin persona"; per candidate the button "Pasar la cuenta a {nombre}" (same confirmation as phase 2); empty candidates text "Sin shidoin ni fukushidoin: pásala desde la ficha del socio"; empty list "Ningún club usa ya una cuenta de club".
- Tests: use case suite (one shidoin, shidoin preferred over fukushidoin, only fukushidoin, several, none, placeholder without user excluded, inactive licence ignored); router suite (super admin 200, club admin 403); vitest for the section rows and buttons.

- [ ] Write the failing tests.
- [ ] Implement the use case, the endpoint and the admin section in the clubs page reusing phase 2's mutation.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1: the card app refuses club accounts.

Retiring shared logins one shidoin at a time, powered by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
