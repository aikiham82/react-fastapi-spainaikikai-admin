# 🎯 Social login only vouches for an email

## 💡 Convention

Google sign-in goes through Clerk, and Clerk **only proves who the person is**. The backend exchanges the Clerk session token at `POST /api/v1/auth/social-login` for its own JWT, and only when Clerk reports a **verified** primary email that belongs to an **existing, active** user. Social login never creates accounts, never decides roles, and every refusal answers exactly like a wrong password.

The client signs out of Clerk right after the exchange, so our JWT is the only session and logout stays as it was.

The adapter also refuses impersonation tokens (`act` claim) and non-ASCII emails, which the case-insensitive collation could fold onto a real address. An active account that has not set a password yet can enter with Google: proving the inbox is the same proof the activation link asks for.

## 🏆 Benefits

- Access is still granted by a club or the federation (`GrantMemberAccess`, card activation). A Google account nobody gave access to gets nothing.
- Roles stay two-level (`global_role` + `club_role`) and `/users/me`, guards and the 401 interceptor need no change.
- Matching on an unverified email would let anyone who adds a victim's address to a Clerk account sign in as them; the adapter fetches the Clerk user precisely to read the verification status.
- Without Clerk keys the button is hidden and the endpoint refuses everyone, so local runs and CI need no secrets.

## 👀 Examples

### ✅ Good: refuse unless verified, known and active

```python
email = await self.identity_provider.verified_email(token)
if not email:
    return None
user = await self.user_repository.find_by_email(email)
return user if user and user.is_active else None
```

### ❌ Bad: create the account on first Google sign-in

```python
user = await self.user_repository.find_by_email(email)
if not user:
    user = await self.user_repository.create(User(email=email, username=email))
```

Self-registered accounts once could read every member's personal data. A Google button must not reopen that door.

### ❌ Bad: trust an email claim without its verification status

```python
email = claims.get("email")
```

The default Clerk session token carries no email, and a custom claim says nothing about whether the address was verified.

## ⚙️ Setup

1. Clerk dashboard: create the application, enable only **Google** under social connections, require no extra sign-up field (no username, no password, no phone), and keep **Sign-up mode → Public**. Every member is new to Clerk, so their first Google sign-in is a Clerk sign-up: **Restricted** mode refuses it and nobody gets in. The gate is our backend, not Clerk; a stranger gets a Clerk user and our `401`.
   Also in the dashboard: disable email, password and code sign-in (Google only); a tab closed before the exchange leaves a Clerk session in that browser, so shorten the session lifetime once on a paid plan (on Hobby it is fixed at 7 days and only the immediate sign-out limits it); protect the dashboard with MFA and few members, because dashboard impersonation tokens (`act` claim) are refused but a dashboard owner can still create users with verified emails; add the app redirect (`spain-aikikai://`) to the native application allowlist.
2. Keys, never committed:
   - Backend: `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES` with the panel and Expo web origins (comma-separated). A token that names an origin (`azp`) must name one of them, so an empty list refuses every web token; a native app token names none and is accepted. Only session tokens are considered. Optional `CLERK_JWT_KEY` (PEM public key) verifies the signature without calling Clerk.
   - Frontend: `VITE_CLERK_PUBLISHABLE_KEY`, a Docker build arg, so it must be set in the deploy's build arguments.
   - Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, set in the EAS build profile. `@clerk/expo` adds native code (config plugins in `app.json`), so it needs a new EAS build; an `eas update` alone does not ship it. Google is hidden on iOS until Sign in with Apple is added (App Store guideline 4.8).
3. Development keys (`pk_test_`/`sk_test_`) use Clerk's shared Google credentials and work on `localhost`. Browser QA needs a real development key: with an invented one Clerk never loads, the Google button stays hidden and `/sso-callback` gives up after 20 s.

   A refused exchange is a `401`; the API client must treat `/auth/social-login` like `/auth/login` (`isSignInAttempt`), or its expired-session handler wipes storage and reloads `/login` before the refusal message shows.
4. Production needs a Clerk **production instance** on the panel's own domain (DNS records Clerk lists), and **our own Google OAuth client** in Google Cloud with the consent screen published ("In production"), the Clerk redirect URI and the panel origin authorised.

   Where it lives (set up 2026-10-27): Clerk application "Spain Aikikai" (production instance on `spainaikikai.org`, Frontend API `clerk.spainaikikai.org`); the five CNAMEs Clerk lists (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) in the OVH zone; the Google OAuth client "Clerk Spain Aikikai" in the Google Cloud project `spain-aikikai-login` (account `spainaikikai.web`), kept apart from the WordPress mail project; keys in Dokploy (backend env, frontend build arg). The production secret key is the one named `backend` in Clerk.

## 🧐 Real world examples

- [`backend/src/application/use_cases/user_use_cases.py`](../../backend/src/application/use_cases/user_use_cases.py): `LoginWithIdentityProviderUseCase`.
- [`backend/src/infrastructure/adapters/services/clerk_identity_provider.py`](../../backend/src/infrastructure/adapters/services/clerk_identity_provider.py): token verification and the verified primary email.
- [`backend/src/infrastructure/web/routers/users.py`](../../backend/src/infrastructure/web/routers/users.py): `/auth/social-login` shares `_invalid_login` and `_issue_token` with `/auth/login`.
- [`frontend/src/features/auth/components/SsoCallback.tsx`](../../frontend/src/features/auth/components/SsoCallback.tsx): the exchange and the Clerk sign-out.
- [`mobile/src/features/auth/components/GoogleSignIn.tsx`](../../mobile/src/features/auth/components/GoogleSignIn.tsx): the same exchange in the app.

## 🔗 Related agreements

- [`auth-endpoints.md`](auth-endpoints.md): one failure, bounded work.
- [`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md): roles come from our data, never from the provider.
- [`../domain/club-admins-manage-member-access.md`](../domain/club-admins-manage-member-access.md): who grants access.

Only known faces past the door, checked by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
