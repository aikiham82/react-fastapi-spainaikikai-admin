# 🎯 Security guidelines

## 💡 Convention

- **Authentication is OAuth2 with JWT tokens.** The token carries identity; authorisation is decided server-side from it, never from a value the client supplies.
- **Passwords are hashed with bcrypt.** No other algorithm, no plaintext, no reversible encoding, not even in fixtures.
- **Routes are protected on both sides.** The frontend hides what a user may not reach; the backend rejects it. Frontend gating is user experience, not security, so the backend check is never optional.
- **The administration API requires an admin, and the rule lives in one place.** Every router except the public and self-service ones is included in `backend/src/app.py` with `require_admin_access`, which answers `403` unless the caller is a super admin or a club admin. A router added without it fails `backend/tests/api/test_admin_api_requires_admin.py`, which walks every route of the real application. A route meant for any caller is added to that test's open list on purpose, never by leaving the guard off.
- **"No club" never means "no filter".** A user with no linked member has no club; only `ctx.is_super_admin` may lift a club filter.
- **Configuration comes from the environment.** No credential, connection string, key or token is committed. `backend/.env*` is ignored except for `backend/.env.example`, which holds placeholders only.
- **Validate at the boundary.** Every request body is a Pydantic DTO with real constraints; a query parameter reaching a Mongo filter is validated before it gets there.
- **Errors do not leak internals.** Return a useful message and status to the client, log the detail server-side.

Before any commit: no hardcoded secret, every input validated, authorisation verified on the endpoint, and no sensitive data in an error response.

## 🏆 Benefits

- Deciding authorisation from the token means a forged client cannot escalate by sending a different role.
- Environment-based configuration lets the same image run in every environment, and a leaked repository leaks no credential.
- Validating at the boundary keeps malformed data out of the domain, so entities can trust what they receive.

## 👀 Examples

### ✅ Good: authorisation derived server-side

```python
@router.get("/clubs/{club_id}/members")
async def list_members(
    club_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    use_case: GetClubMembersUseCase = Depends(get_club_members_use_case),
):
    if not can_access_club(current_user, club_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await use_case.execute(club_id)
```

### ❌ Bad: trusting the client and leaking the cause

```python
@router.get("/clubs/{club_id}/members")
async def list_members(club_id: str, role: str):      # role from the client
    if role != "admin":
        raise HTTPException(status_code=403)
    try:
        ...
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))   # leaks internals
```

Anyone can pass `role=admin`, and the error hands the caller a stack detail.

## 🧐 Real world examples

- [`backend/src/infrastructure/web/authorization.py`](../../backend/src/infrastructure/web/authorization.py)
- [`backend/src/infrastructure/web/dependencies.py`](../../backend/src/infrastructure/web/dependencies.py)
- [`frontend/src/core/hooks/usePermissions.ts`](../../frontend/src/core/hooks/usePermissions.ts)
- [`.env.example`](../../.env.example)

## 🔗 Related agreements

- [`../conventions/backend.md`](../conventions/backend.md)
- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md)
