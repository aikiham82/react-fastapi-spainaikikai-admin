# 🎯 Club admins manage the web access of their own members

## 💡 Convention

A club admin gives, manages and removes the login of members of **their own club**, so the federation does not do it by hand. Five limits hold on every route, in the use case where the rule is about data and in the router where it is about the caller:

- **Never another club.** Every route loads the member and checks its club before acting.
- **Never the super admin.** Granting, reactivating, changing the role or removing access of the member linked to a `super_admin` account answers 409; the account routes answer 403.
- **Never a peer manager's login.** A club admin may not change the email of, or issue a reset link for, another club admin's account: either hands them that account. They may still change the peer's role or remove their access, which is the point of "who manages the club".
- **Never yourself.** Nobody changes their own role or removes their own access.
- **Never an empty club.** Demoting or removing an admin is refused unless another admin **with an active account** remains. An admin nobody can sign in as does not count.

Removing access deactivates the account and kills its reset tokens; it is not deleted. Giving access again reactivates it with the new email.

## 🏆 Benefits

- 2026-10-25: a club needed a second manager and the only way was a manual database change. The project exists to stop that.
- Code review found the takeover paths (peer email change, super admin reactivation, admins without login counting as "another admin") before release; security QA found `/club-role` missing the super admin guard every sibling route had.

## 👀 Examples

### ✅ Good: the data rule lives in the use case

```python
if member_id == changed_by_member_id:
    raise AccessChangeNotAllowedError("You cannot change your own role")
account = await self.user_repository.find_by_member_id(member_id)
if account and account.global_role == GlobalRole.SUPER_ADMIN:
    raise AccessChangeNotAllowedError("The super admin's member cannot be changed here")
```

### ❌ Bad: one route forgets the guard its siblings have

```python
@router.patch("/{member_id}/club-role")
async def set_member_club_role(...):
    await _load_member_in_callers_club(ctx, member_id, get_member)  # club checked
    return await set_role.execute(member_id, role)                  # super admin not
```

## 🧐 Real world examples

- [`club_role_use_cases.py`](../../backend/src/application/use_cases/member_access/club_role_use_cases.py)
- [`grant_member_access_use_case.py`](../../backend/src/application/use_cases/member_access/grant_member_access_use_case.py)
- [`users.py` `_require_account_in_callers_club`](../../backend/src/infrastructure/web/routers/users.py)
- [`test_account_support_for_club_admins.py`](../../backend/tests/api/test_account_support_for_club_admins.py)

## 🔗 Related agreements

- [Roles and permissions](roles-and-permissions.md)
- [Auth endpoints](../security/auth-endpoints.md)
