# 🎯 A club is switched off only by deregistration

## 💡 Convention

A club leaves the federation through **one** operation: `POST /clubs/{club_id}/deregister`, super admin only (`DeregisterClubUseCase`). It switches off, in one go:

- the club record, when it exists (`is_active = false`, shown as "De baja");
- every member with that `club_id`, including the club account placeholder;
- every active login of those members, through `switch_off_login` (deactivated, reset links killed), except the super admin's.

It works on the `club_id`, not on the club record, because members of some clubs point to a record that no longer exists. Running it again changes nothing and answers `{members: 0, accounts: 0}`.

`ClubUpdate` does **not** accept `is_active`, and giving web access to a member who is de baja is refused (422).

## 🏆 Benefits

- 2026-10-27: five clubs with a shared login had left the federation; the only way out was editing the database by hand.
- Security QA found that, while `ClubUpdate` took `is_active`, any member with web access could mark their own club "De baja": it vanished from payment summaries and lost its deregister button while its members kept signing in.

## 👀 Examples

### ✅ Good: deregister switches off everything that belongs to the club

```python
await DeregisterClubUseCase(clubs, members, users, tokens).execute(club_id)
```

### ❌ Bad: a flag that marks the club and leaves its people signing in

```python
await update_club.execute(club_id, is_active=False)
```

## 🧐 Real world examples

- [`deregister_club_use_case.py`](../../backend/src/application/use_cases/club/deregister_club_use_case.py)
- [`switch_off_login.py`](../../backend/src/application/use_cases/member_access/switch_off_login.py)
- [`DeregisterClubButton.tsx`](../../frontend/src/features/clubs/components/DeregisterClubButton.tsx)

## 🔗 Related agreements

- [Club accounts are passed to a person, never used as one](club-accounts-pass-to-a-person.md)
- [Club admins manage the web access of their own members](club-admins-manage-member-access.md)
