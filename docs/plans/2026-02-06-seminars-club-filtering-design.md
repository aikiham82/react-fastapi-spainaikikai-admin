# Seminars Club-Based Filtering

## Summary

Club admins should only see, create, edit, and delete seminars belonging to their club. Super admins retain full access to all seminars. Enforcement happens both in the backend (security) and frontend (UX).

## Decisions

| Decision | Choice |
|---|---|
| Who is filtered? | Club admins only. Super admins see all. |
| Seminar creation | `club_id` assigned automatically from auth context for club admins. No club field in form. |
| Backend enforcement | Yes. Backend forces `club_id` filter for club admins, ignores query params. |
| Edit/delete enforcement | Yes. Backend returns 403 if club admin tries to modify another club's seminar. |

## Backend Changes

### 1. `GET /seminars` — List endpoint

In the router, after getting `auth_context`:

- If `auth_context.global_role == "user"` (club admin):
  - Ignore `club_id` query param
  - Use `auth_context.club_id` to call `GetAllSeminarsUseCase.execute(club_id=auth_context.club_id)`
  - If user has no `club_id`, return empty list
- If `auth_context.global_role == "super_admin"`:
  - No change. Pass through `club_id`/`association_id` query params as before.

**File:** `backend/src/infrastructure/web/routers/seminars.py`

### 2. `POST /seminars` — Create endpoint

In the router, before calling the use case:

- If `auth_context.global_role == "user"`:
  - Override `dto.club_id` with `auth_context.club_id`
- If `auth_context.global_role == "super_admin"`:
  - No change. Use `club_id` from DTO body.

**File:** `backend/src/infrastructure/web/routers/seminars.py`

### 3. `PUT /seminars/{id}` — Update endpoint

In the router, after fetching the seminar:

- If `auth_context.global_role == "user"`:
  - Fetch seminar via `GetSeminarUseCase`
  - If `seminar.club_id != auth_context.club_id` → raise `SeminarAccessDeniedError` (HTTP 403)
  - Prevent changing `club_id` field (ignore it from DTO)
- If `auth_context.global_role == "super_admin"`:
  - No change.

**File:** `backend/src/infrastructure/web/routers/seminars.py`

### 4. `DELETE /seminars/{id}` — Delete endpoint

Same pattern as update:

- If `auth_context.global_role == "user"`:
  - Fetch seminar first
  - If `seminar.club_id != auth_context.club_id` → raise `SeminarAccessDeniedError` (HTTP 403)
- If `auth_context.global_role == "super_admin"`:
  - No change.

**File:** `backend/src/infrastructure/web/routers/seminars.py`

### 5. `PUT /seminars/{id}/cancel` — Cancel endpoint

Same ownership check as update/delete for club admins.

**File:** `backend/src/infrastructure/web/routers/seminars.py`

### 6. New exception

Add `SeminarAccessDeniedError` to domain exceptions. Map to HTTP 403 in the router.

**File:** `backend/src/domain/exceptions/seminar.py`

### What does NOT change

- **Use cases**: No changes. Authorization lives in the web layer.
- **Repository**: No changes. Queries already support `club_id` filtering.
- **DTOs/Mappers**: No changes.

## Frontend Changes

### 1. `useSeminarContext.tsx` — Automatic filtering

When building filters for `useSeminarsQuery`:

```typescript
const { clubId, effectiveRole } = useAuthContext();

// Build filters with automatic club scoping
const effectiveFilters = useMemo(() => {
  if (effectiveRole !== 'super_admin' && clubId) {
    return { ...filters, club_id: clubId };
  }
  return filters;
}, [filters, effectiveRole, clubId]);
```

Pass `effectiveFilters` to `useSeminarsQuery` instead of raw `filters`.

**File:** `frontend/src/features/seminars/hooks/useSeminarContext.tsx`

### 2. `SeminarForm.tsx` — Auto-assign club_id on create

On form submit for club admins:

```typescript
const { clubId, effectiveRole } = useAuthContext();

const handleSubmit = () => {
  const payload = { ...formData };
  if (effectiveRole !== 'super_admin' && clubId) {
    payload.club_id = clubId;
  }
  // submit payload
};
```

No `club_id` field shown in the form for club admins.

**File:** `frontend/src/features/seminars/components/SeminarForm.tsx`

### 3. `SeminarList.tsx` — No visible changes

The list component does not change. It receives fewer items because the query is already filtered. Edit/delete buttons remain visible (backend handles rejection if needed).

## Files Modified

| File | Change |
|---|---|
| `backend/src/domain/exceptions/seminar.py` | Add `SeminarAccessDeniedError` |
| `backend/src/infrastructure/web/routers/seminars.py` | Add role-based filtering and ownership checks |
| `frontend/src/features/seminars/hooks/useSeminarContext.tsx` | Add automatic `club_id` filter based on role |
| `frontend/src/features/seminars/components/SeminarForm.tsx` | Auto-inject `club_id` for club admins on submit |

## Security Model

```
Club Admin (global_role="user"):
  GET /seminars      → forced filter by own club_id
  POST /seminars     → club_id injected from auth context
  PUT /seminars/:id  → 403 if seminar.club_id != own club_id
  DELETE /seminars/:id → 403 if seminar.club_id != own club_id
  PUT /seminars/:id/cancel → 403 if seminar.club_id != own club_id

Super Admin (global_role="super_admin"):
  All endpoints → no restrictions (current behavior)
```

## Out of Scope

- Club selector for super_admin in the seminar form (future enhancement)
- Association-level filtering changes
- UI changes to seminar cards or list layout
