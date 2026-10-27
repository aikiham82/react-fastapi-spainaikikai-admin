# 🎯 Social login only vouches for an email

## 💡 Convention

Google sign-in goes through Clerk, and Clerk **only proves who the person is**. The backend exchanges the Clerk session token at `POST /api/v1/auth/social-login` for its own JWT, and only when Clerk reports a **verified** primary email that belongs to an **existing, active** user. Social login never creates accounts, never decides roles, and every refusal answers exactly like a wrong password.

The client signs out of Clerk right after the exchange, so our JWT is the only session and logout stays as it was.

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

1. Clerk dashboard: create the application, enable only **Google** under social connections, and set **Restrictions → Sign-up mode → Restricted** so strangers cannot create Clerk users.
2. Keys, never committed:
   - Backend: `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES` with the panel and Expo web origins (comma-separated). A token that names an origin (`azp`) must name one of them; a native app token names none and is accepted.
   - Frontend: `VITE_CLERK_PUBLISHABLE_KEY`, a Docker build arg, so it must be set in the deploy's build arguments.
   - Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, set in the EAS build profile. `@clerk/expo` adds native code (config plugins in `app.json`), so it needs a new EAS build; an `eas update` alone does not ship it. Google is hidden on iOS until Sign in with Apple is added (App Store guideline 4.8).
3. Development keys (`pk_test_`/`sk_test_`) use Clerk's shared Google credentials and work on `localhost`.
4. Production needs a Clerk **production instance** on the panel's own domain (DNS records Clerk lists), and **our own Google OAuth client** in Google Cloud with the consent screen published ("In production"), the Clerk redirect URI and the panel origin authorised.

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
