---
name: "Clerk Google social login"
description: "Sign in with Google through Clerk on the admin web and the mobile app, exchanged for the backend's own JWT"
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

last_implementation_at: "2026-10-27T13:55:00Z"
has_completed_all_phases: "true"
---

# Clerk Google social login

## 🎯 Goal

Let existing users sign in with Google on the admin web and the mobile app. Clerk only authenticates: the backend verifies the Clerk session token, matches the verified email against an existing active user and returns the same JWT that `/auth/login` returns. Unknown, inactive or unverified accounts are refused.

## 👀 Context

- Design: Clerk authenticates, our backend authorises. Roles, `/users/me`, guards and logout are unchanged. No MongoDB change. The client signs out of Clerk right after the exchange, so our JWT is the only session.
- Without Clerk keys the Google button is hidden and the endpoint answers `401`, so local and CI builds work without secrets.
- iOS: Google is hidden on iOS until Sign in with Apple is added (App Store guideline 4.8). iOS is not published yet (`mobile/eas.json` `ascAppId` placeholder).
- Backend:
  - [`backend/src/infrastructure/web/routers/users.py`](../../../backend/src/infrastructure/web/routers/users.py): `/auth/login` (JWT `sub`=email, `user_id`), `INVALID_LOGIN` 401 body.
  - [`backend/src/infrastructure/web/security.py`](../../../backend/src/infrastructure/web/security.py): `create_access_token`.
  - [`backend/src/application/use_cases/user_use_cases.py`](../../../backend/src/application/use_cases/user_use_cases.py), [`backend/src/application/ports/repositories.py`](../../../backend/src/application/ports/repositories.py): `UserRepositoryPort.find_by_email` (case-insensitive collation).
  - [`backend/src/infrastructure/web/dependencies.py`](../../../backend/src/infrastructure/web/dependencies.py): use case wiring.
- Frontend:
  - [`frontend/src/features/auth/components/LoginForm.tsx`](../../../frontend/src/features/auth/components/LoginForm.tsx), [`frontend/src/features/auth/hooks/useAuthContext.tsx`](../../../frontend/src/features/auth/hooks/useAuthContext.tsx) (token storage), [`frontend/src/features/auth/data/auth.service.ts`](../../../frontend/src/features/auth/data/auth.service.ts), [`frontend/src/App.tsx`](../../../frontend/src/App.tsx), [`frontend/Dockerfile`](../../../frontend/Dockerfile).
- Mobile:
  - [`mobile/app/login.tsx`](../../../mobile/app/login.tsx), [`mobile/src/features/auth/auth.service.ts`](../../../mobile/src/features/auth/auth.service.ts), [`mobile/src/features/auth/hooks/mutations/useLoginMutation.ts`](../../../mobile/src/features/auth/hooks/mutations/useLoginMutation.ts), [`mobile/app/_layout.tsx`](../../../mobile/app/_layout.tsx).
- Docs: [`docs/security/auth-endpoints.md`](../../../docs/security/auth-endpoints.md), [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`docs/domain/the-card-is-for-every-member-the-panel-for-managers.md`](../../../docs/domain/the-card-is-for-every-member-the-panel-for-managers.md), [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md), [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

### Real-data matrix

Production `users` (read-only, 2026-10-27): 150 users, 98 Gmail, 1 super admin, 5 inactive, 0 duplicate emails.

| Case | Expected |
|---|---|
| Active super admin | Enters the panel |
| Active club admin | Enters the panel |
| Active member without management role | Web: `/unauthorized`. Mobile: card |
| Inactive user | `401` |
| Unknown email | `401` |
| Google email not verified in Clerk | `401` |
| Expired or forged token | `401` |
| Email casing differs from the stored one | Enters |

## 🪜 Phases

### Phase 1: Google sign-in on the admin web

End-to-end exchange endpoint plus the web button and callback.

Public contracts:

- Port `IdentityProviderPort.verified_email(token: str) -> str | None`.
- Adapter `ClerkIdentityProvider` (`clerk-backend-api`): verifies the token with `authorized_parties`, fetches the Clerk user and returns its primary email only if verified.
- Use case `LoginWithIdentityProviderUseCase.execute(token: str) -> User | None`.
- Endpoint `POST /api/v1/auth/social-login`, body `{ "token": str }`, response `Token`. Any failure: `401` with the same body as `/auth/login`. No password hash.
- Env: `CLERK_SECRET_KEY`, `CLERK_AUTHORIZED_PARTIES` (backend); `VITE_CLERK_PUBLISHABLE_KEY` (frontend, Dockerfile ARG).
- Route `/sso-callback`.
- Copy: "Entrar con Google", "o", error "No hemos podido entrar con Google. Usa el correo con el que tu club te dio acceso."
- Test suites:
  - `LoginWithIdentityProviderUseCase`: returns the active user for a verified email; returns None for unknown email; None for inactive user; None when the provider returns None.
  - `/auth/social-login` router: 200 with a token whose `sub` is the user email; same 401 body for unknown, inactive and invalid token.
  - `ClerkIdentityProvider`: None without secret key; None for an invalid token; None when the primary email is unverified; the email when verified.
  - `LoginForm`: Google button shown only with a publishable key.
  - SSO callback: exchanges the Clerk token, stores our token and navigates home; shows the error on 401.

- [x] Add `clerk-backend-api` to the backend and the port, adapter, use case and endpoint with tests.
- [x] Add `@clerk/react`, `ClerkProvider` (only when the key exists), the Google button and `/sso-callback` with tests.
- [x] Document the endpoint in `docs/security/auth-endpoints.md` and the Clerk setup in a new doc, with env vars in `.env.example` files.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Google sign-in on the mobile app

Public contracts:

- `@clerk/expo` with `useSSO` (`oauth_google`), env `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `authService.socialLogin(token)` calling `POST /auth/social-login`, then the current `/users/me` + `signIn` flow.
- Copy: same as the web.
- Test suites: social login mutation exchanges the token and signs in; Google button hidden on iOS and without key.

- [x] Add `@clerk/expo`, the Google button on `mobile/app/login.tsx` (Android and web only) and the exchange, with tests.
  - Deviation: `mobile/` has no test runner, and adding one is its own change. Verified with `tsc --noEmit` and an `expo export --platform web` bundle instead.
  - Added: native tokens carry no `azp`, so the backend adapter checks `azp` itself (a present `azp` must be allowlisted, an absent one passes), with tests.
- [x] Note in the Clerk doc that native needs a development build and a new EAS build.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are done: configure the Clerk application and keys, then ship a new EAS build for the app.

Web and app doors now open with Google for known faces only, under [Codely](https://codely.com)'s Turbotuga™ watch. 🔑 🚪 📱 🐢 💨
