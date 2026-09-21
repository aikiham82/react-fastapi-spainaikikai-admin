# 🎯 Authentication endpoints

## 💡 Convention

An endpoint anyone can reach without a token answers the **same way** whether the account exists or not, and does a **bounded** amount of work. Three rules:

1. **One answer.** `POST /auth/password-reset/request` returns the same body for a real account, an unknown identifier, an inactive account, a rate-limited one and a failed delivery. Log the difference; never return it.
2. **One failure.** Wrong password, unknown account and deactivated account all answer `401` with the same message. A different status confirms the account exists.
3. **Bounded work.** Cap how many password hashes one request can cause. Bcrypt costs ~200 ms per check and runs synchronously, so an unbounded loop blocks the whole API, not just that request.

## 🏆 Benefits

- A club name is public. Without rule 1, typing one into the reset form tells an attacker which clubs are registered, which was exactly the capability the feature was meant to give clubs, not strangers.
- Rule 2 removes the password-confirmation oracle: an attacker who guesses the password of a disabled account learns nothing from a `400` that a `401` would not have hidden.
- Rule 3 turns a denial of service into a cost the attacker pays. With `/auth/register` open and user names matched loosely, planted look-alike accounts once made every login attempt cost one hash per plant.
- Rules 1 and 2 together mean the answer carries no information, so nobody has to reason about which branch leaks what.

## 👀 Examples

### ✅ Good: the reset answers the same, whatever happened

```python
for account in accounts:
    if not account.is_active:
        continue

    sent = await self._send_link_to(account)
    if not sent:
        # Reporting the failure would tell the caller the account exists,
        # and would deny the remaining accounts their link.
        logger.error(f"Could not deliver a password reset link for user {account.id}")

# Whatever happened, the answer is the same (anti-enumeration)
return RequestPasswordResetResult()
```

### ✅ Good: bounded, and inactive accounts never decide the answer

```python
MAX_LOGIN_CANDIDATES = 5

active_candidates = [
    c for c in candidates if c.is_active and c.hashed_password
][:MAX_LOGIN_CANDIDATES]

user = next(
    (c for c in active_candidates if verify_password(form_data.password, c.hashed_password)),
    None
)

if not user:
    raise HTTPException(status_code=401, detail="Incorrect username or password")
```

The slice caps the hashing. Dropping inactive accounts first stops a disabled twin from answering for an active account, and dropping rows with an empty hash stops a migrated row from raising inside the loop.

### ❌ Bad: a second answer that only a real account can produce

```python
sent = await self._send_link_to(account)
if not sent:
    return RequestPasswordResetResult(
        success=False,
        message="No se pudo enviar el correo. Intentalo mas tarde."
    )
```

This branch is reachable only once the identifier matched a real, active account. Four production accounts hold an address that cannot receive anything, so their club names return this message while every invented name returns the generic one. It also abandons the remaining accounts, so a dead mailbox denies its twin the link.

### ❌ Bad: a status that separates "wrong password" from "disabled account"

```python
if not verify_password(password, user.hashed_password):
    raise HTTPException(status_code=401, detail="Incorrect username or password")

if not user.is_active:
    raise HTTPException(status_code=400, detail="Inactive user")
```

Reaching the `400` proves the password was right. The same applies to the authenticated path: `get_current_active_user` answers `401` so the browser signs the user out, since the frontend interceptor only reacts to `401`.

### ❌ Bad: hashing once per match, with the match count open

```python
user = next(
    (c for c in candidates if verify_password(form_data.password, c.hashed_password)),
    None
)
```

`candidates` is whatever the identifier resolved to. While `/auth/register` accepts anonymous sign-ups and uniqueness is checked more strictly than logins resolve names, an attacker registers case and spacing variants of a club name and every login as that club pays one bcrypt per variant, on the event loop.

## 🧐 Real world examples

- [`backend/src/application/use_cases/password_reset/request_password_reset_use_case.py`](../../backend/src/application/use_cases/password_reset/request_password_reset_use_case.py): the single answer, and the availability check placed before the lookup so a configuration failure cannot be told apart from a missing account.
- [`backend/src/infrastructure/web/routers/users.py`](../../backend/src/infrastructure/web/routers/users.py): `MAX_LOGIN_CANDIDATES`, the active-only filter and the uniform `401`.
- [`backend/src/application/use_cases/user_use_cases.py`](../../backend/src/application/use_cases/user_use_cases.py): `CreateUserUseCase` checks uniqueness with the same loose rule logins resolve names by, so the variants cannot be created.
- [`backend/tests/infrastructure/web/test_login_with_username_router.py`](../../backend/tests/infrastructure/web/test_login_with_username_router.py): `test_only_a_bounded_number_of_passwords_is_checked` pins the cap.

## 🔗 Related agreements

- [`security-guidelines.md`](security-guidelines.md): the checks that apply to every commit.
- [`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md): who may reach the endpoints that are not public.
- [`no-production-data.md`](../testing/no-production-data.md): what may appear in the fixtures that exercise these paths.

Answers kept identical by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
