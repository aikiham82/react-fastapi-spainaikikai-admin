# 🎯 Roles and permissions

## 💡 Convention

Roles are **two-level**. Neither level alone decides what a user may do.

### Backend model

```python
User.global_role: GlobalRole   # super_admin | user
Member.club_role: ClubRole     # admin | member
```

`global_role` lives on the user account. `club_role` lives on the `Member` record linked to that user, so a user's club authority comes from their membership, not from their account.

### `/users/me` response

The endpoint enriches the user with the linked member's fields:

```json
{
  "global_role": "user",
  "member_id": "...",
  "club_role": "admin",
  "club_id": "..."
}
```

### Effective role, derived on the frontend

```typescript
type GlobalRole = 'super_admin' | 'user'
type ClubRole   = 'admin' | 'member'
type UserRole   = 'super_admin' | 'club_admin' | null   // effective

userRole = global_role === 'super_admin' ? 'super_admin'
         : club_role === 'admin'         ? 'club_admin'
         : null
```

`usePermissions.ts` exposes `canAccess()`, which gates sidebar entries through `filteredNavItems`.

**Frontend gating is user experience, not security.** The backend must independently authorise every request; see [`../security/security-guidelines.md`](../security/security-guidelines.md).

## 🏆 Benefits

- A club administrator gets their authority from their membership, so moving clubs moves their rights with them.
- One derivation in one place means the sidebar, route guards and feature checks cannot disagree.
- Keeping the effective role out of the API response stops a client from claiming a role it was not granted.

## 👀 Examples

### ✅ Good: checking the effective role

```tsx
const { userRole } = useAuthContext()
if (userRole === 'club_admin') { /* club administration */ }
```

### ❌ Bad: checking one level in isolation

```tsx
if (user.global_role === 'admin') { ... }   // not a valid GlobalRole value
if (user.club_role === 'admin') { ... }     // ignores super_admin entirely
```

The first tests a value that does not exist in the enum, so it is always false. The second locks a super admin out of club screens.

## 🧐 Real world examples

- [`backend/src/domain/entities/user.py`](../../backend/src/domain/entities/user.py): `GlobalRole`
- [`backend/src/domain/entities/member.py`](../../backend/src/domain/entities/member.py): `ClubRole`
- [`backend/src/infrastructure/web/authorization.py`](../../backend/src/infrastructure/web/authorization.py): `AuthContext`
- [`frontend/src/features/auth/data/auth.schema.ts`](../../frontend/src/features/auth/data/auth.schema.ts)
- [`frontend/src/features/auth/hooks/useAuthContext.tsx`](../../frontend/src/features/auth/hooks/useAuthContext.tsx): the derivation
- [`frontend/src/core/hooks/usePermissions.ts`](../../frontend/src/core/hooks/usePermissions.ts): `canAccess()`

## 🔗 Related agreements

- [`../security/security-guidelines.md`](../security/security-guidelines.md)
- [`payment-cycles.md`](payment-cycles.md)
