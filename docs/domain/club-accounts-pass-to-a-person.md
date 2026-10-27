# 🎯 Club accounts are passed to a person, never used as one

## 💡 Convention

A **club account** is a login the MariaDB migration hung from a fake member, `"<Club> (Club Admin)"`, because the old system had one shared login per club. That member has no licence and is nobody. The rules:

- **Recognise it in one place.** `Member.is_club_account_placeholder` (and `is_club_account_placeholder_name` for raw input) is the only code that knows the `"(Club Admin)"` marker. `/users/me` exposes it as `is_club_account`.
- **The last name is reserved.** Creating a member or renaming one to `"(Club Admin)"` is refused for everyone, imports included; only the placeholder itself keeps it. A renamed member would otherwise pass for a club account.
- **The card app refuses it.** The app is each member's card; a club account sees "Esta es la cuenta del club" and a link to the admin web. The panel still accepts it.
- **A super admin passes it to a person.** `POST /clubs/{club_id}/account/transfer` names the `account_id` the super admin saw and the member: the same user (email, username, password) is relinked to the member, who becomes club admin, its reset tokens die and the placeholder becomes inactive. The clubs page lists the remaining ones with the club's shidoin, or fukushidoin, as the proposed person.

## 🏆 Benefits

- 2026-10-26: a shidoin entering the card app with his club's account saw "Sin licencia vigente": the app showed the placeholder's (missing) licence, not his. 39 clubs were in that state.
- Keeping the credentials means whoever ran the club keeps signing in exactly as before, panel and app, now as themselves.
- Security QA found that choosing "the club's placeholder" server side let a club admin rename a member with an account to `"(Club Admin)"` and get that login moved instead. Naming the account and reserving the name close it.

## 👀 Examples

### ✅ Good: the caller names the account it saw

```python
account = await self.user_repository.find_by_id(account_id)
placeholder = await self.member_repository.find_by_id(account.member_id)
if not (account.is_active and placeholder.is_club_account_placeholder and placeholder.club_id == club_id):
    raise ClubAccountNotFoundError(club_id)
```

### ❌ Bad: the server picks whatever looks like a placeholder

```python
for member in await self.member_repository.find_by_club_id(club_id):
    if member.last_name == "(Club Admin)":   # a club admin can type this
        return await self.user_repository.find_by_member_id(member.id)
```

## 🧐 Real world examples

- [`transfer_club_account_use_case.py`](../../backend/src/application/use_cases/member_access/transfer_club_account_use_case.py)
- [`list_club_accounts_use_case.py`](../../backend/src/application/use_cases/member_access/list_club_accounts_use_case.py)
- [`Member.is_club_account_placeholder`](../../backend/src/domain/entities/member.py)
- [`ClubAccountsSection.tsx`](../../frontend/src/features/clubs/components/ClubAccountsSection.tsx)
- [`useAuth.ts`](../../mobile/src/features/auth/hooks/useAuth.ts) (card app refusal)

## 🔗 Related agreements

- [Club admins manage the web access of their own members](club-admins-manage-member-access.md)
- [Roles and permissions](roles-and-permissions.md)
