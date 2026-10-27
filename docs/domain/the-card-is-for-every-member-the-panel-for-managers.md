# 🎯 The card is for every member, the panel for managers

## 💡 Convention

Seeing the card and running the club are two different accesses, held by the same kind of account:

- **Card (app):** any member activates it alone with "¿Primera vez? Activa tu carné" (`POST /auth/card-access/request`). An account is created only when the email belongs to **exactly one active member** who has no account, is not a club manager, and whose email no login uses; the member is claimed atomically (`claim_card_access`) so parallel requests create one account. The answer is always the same and the work runs in the background (see [auth endpoints](../security/auth-endpoints.md)).
- **No email of their own, no card:** a member without email, or sharing it with another member, gets nothing until their manager sets one. The member list marks them ("Sin correo propio: no puede ver su carné", `has_own_email`).
- **Panel (web):** only managers and the super admin. A signed-in member who manages nothing lands on `/unauthorized`, which points to the app; the server already refuses them on every admin router. Giving web access is "Hacer responsable del club": it creates the account **and** makes the member manager, and fills an empty member email with the login email.

## 🏆 Benefits

- 2026-10-27: members only saw their card after someone granted access by hand, and that grant also opened the panel, mixing two needs.
- In production only 33 of 388 licensed members without account had an email of their own: making the email the key shows clubs exactly whose file to fix.
- Security QA found the race (several accounts for one member) and the anonymous path to a manager's panel; the claim and the manager refusal close both.

## 👀 Examples

### ✅ Good: anonymous activation never hands out management

```python
if member.is_club_admin:
    return
if not await self.member_repository.claim_card_access(member.id):
    return
```

### ❌ Bad: check, then create

```python
if not await self.user_repository.find_by_member_id(member.id):
    await self.user_repository.create(user)  # two parallel requests both get here
```

## 🧐 Real world examples

- [`request_card_access_use_case.py`](../../backend/src/application/use_cases/member_access/request_card_access_use_case.py)
- [`set_password_link.py`](../../backend/src/application/use_cases/member_access/set_password_link.py)
- [`activate.tsx`](../../mobile/app/activate.tsx)
- [`unauthorized.page.tsx`](../../frontend/src/pages/unauthorized.page.tsx)

## 🔗 Related agreements

- [Club admins manage the web access of their own members](club-admins-manage-member-access.md)
- [Roles and permissions](roles-and-permissions.md)
