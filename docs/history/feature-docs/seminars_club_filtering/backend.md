# Seminars Club-Based Authorization - Backend Implementation Plan

## Overview

This implementation adds club-based authorization to the seminars feature's backend router layer. The goal is to ensure club admins can only view, create, edit, and delete seminars belonging to their club, while super admins retain full access to all seminars.

**Key Principle**: All authorization logic is implemented at the router layer using existing `AuthContext` helpers. No changes to use cases, repositories, DTOs, or mappers are needed.

## Context Files

- Session Context: `.claude/sessions/context_session_seminars_club_filtering.md`
- Full Plan: `docs/plans/2026-02-06-seminars-club-filtering-plan.md`
- Design Doc: `docs/plans/2026-02-06-seminars-club-filtering-design.md`

## Architecture Pattern

We follow the established pattern from other features (clubs, members, payments):
1. Use `AuthContext` injected via `Depends(get_auth_context)`
2. Check `ctx.is_super_admin` to determine permission level
3. For club admins, use `ctx.club_id` to filter/validate operations
4. Use `check_club_access_ctx(ctx, club_id)` for ownership verification

## File to Modify

**Single file**: `/home/abraham/Projects/react-fastapi-spainaikikai-admin/backend/src/infrastructure/web/routers/seminars.py`

Current state: The file already imports `AuthContext` and `get_auth_context`, and all endpoints already have `ctx` parameter, but they don't use it for authorization.

## Required Changes

### 1. Add Import (Line 23)

**Current:**
```python
from src.infrastructure.web.authorization import AuthContext
```

**Change to:**
```python
from src.infrastructure.web.authorization import AuthContext, check_club_access_ctx
```

**Rationale**: We need the `check_club_access_ctx` helper to verify ownership on PUT/DELETE/CANCEL operations.

---

### 2. GET /seminars Endpoint (Lines 28-38)

**Current behavior**: All authenticated users see all seminars regardless of club_id parameter.

**Required behavior**:
- Super admins: See all seminars (no change)
- Club admins: See only their club's seminars (ignore query params, use `ctx.club_id`)
- If club admin has no `club_id`, return empty list

**Implementation:**

```python
@router.get("", response_model=List[SeminarResponse])
async def get_seminars(
    limit: int = 100,
    club_id: Optional[str] = None,
    association_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all seminars, optionally filtered by club or association."""
    # Club admins: force filter by their own club, ignore query params
    if not ctx.is_super_admin:
        effective_club_id = ctx.club_id
        if not effective_club_id:
            return []
        seminars = await get_all_use_case.execute(limit, effective_club_id)
    else:
        seminars = await get_all_use_case.execute(limit, club_id, association_id)
    return SeminarMapper.to_response_list(seminars)
```

**Key points**:
- Check `ctx.is_super_admin` first
- For non-super-admins, get `effective_club_id` from `ctx.club_id`
- If `effective_club_id` is None (user has no linked member), return empty list `[]`
- For club admins, ignore `club_id` and `association_id` query parameters
- For super admins, pass through all parameters unchanged

---

### 3. POST /seminars Endpoint (Lines 63-85)

**Current behavior**: All authenticated users can create seminars with any club_id.

**Required behavior**:
- Super admins: Can create seminars for any club (no change)
- Club admins: Seminars automatically assigned to their club (override `club_id` from request body)

**Implementation:**

```python
@router.post("", response_model=SeminarResponse, status_code=status.HTTP_201_CREATED)
async def create_seminar(
    seminar_data: SeminarCreate,
    get_create_use_case = Depends(get_create_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new seminar."""
    # Club admins: force club_id from auth context
    effective_club_id = seminar_data.club_id
    if not ctx.is_super_admin:
        effective_club_id = ctx.club_id

    seminar = await get_create_use_case.execute(
        title=seminar_data.title,
        description=seminar_data.description,
        instructor_name=seminar_data.instructor_name,
        venue=seminar_data.venue,
        address=seminar_data.address,
        city=seminar_data.city,
        province=seminar_data.province,
        start_date=seminar_data.start_date,
        end_date=seminar_data.end_date,
        price=seminar_data.price,
        max_participants=seminar_data.max_participants,
        club_id=effective_club_id,
        association_id=seminar_data.association_id
    )
    return SeminarMapper.to_response_dto(seminar)
```

**Key points**:
- Start with `effective_club_id = seminar_data.club_id` (for super admins)
- If not super admin, override with `ctx.club_id`
- Pass `effective_club_id` to the use case, not `seminar_data.club_id`
- This prevents club admins from creating seminars for other clubs

---

### 4. PUT /seminars/{seminar_id} Endpoint (Lines 88-97)

**Current behavior**: All authenticated users can update any seminar.

**Required behavior**:
- Super admins: Can update any seminar including changing `club_id`
- Club admins: Can only update their own club's seminars, cannot change `club_id`

**Implementation:**

```python
@router.put("/{seminar_id}", response_model=SeminarResponse)
async def update_seminar(
    seminar_id: str,
    seminar_data: SeminarUpdate,
    get_update_use_case = Depends(get_update_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update seminar."""
    # Club admins: verify ownership
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
        # Prevent club admins from changing club_id
        update_data = seminar_data.model_dump(exclude_none=True)
        update_data.pop("club_id", None)
    else:
        update_data = seminar_data.model_dump(exclude_none=True)
    seminar = await get_update_use_case.execute(seminar_id, **update_data)
    return SeminarMapper.to_response_dto(seminar)
```

**Key points**:
- **NEW DEPENDENCY**: Add `get_one_use_case = Depends(get_seminar_use_case)` parameter
- For club admins:
  1. Fetch existing seminar first
  2. Call `check_club_access_ctx(ctx, existing.club_id or "")` - raises 403 if no access
  3. Build `update_data` dict and remove `club_id` key to prevent changing it
- For super admins: Use update_data as-is
- `check_club_access_ctx` will raise `HTTPException` with 403 status if access denied

**Why we need get_one_use_case**:
- We must verify the seminar belongs to the user's club before allowing updates
- The use case already exists and is imported, we just need to inject it as a dependency
- Using `or ""` for club_id handles the edge case where seminar has no club_id (will fail access check)

---

### 5. PUT /seminars/{seminar_id}/cancel Endpoint (Lines 100-108)

**Current behavior**: All authenticated users can cancel any seminar.

**Required behavior**:
- Super admins: Can cancel any seminar
- Club admins: Can only cancel their own club's seminars

**Implementation:**

```python
@router.put("/{seminar_id}/cancel", response_model=SeminarResponse)
async def cancel_seminar(
    seminar_id: str,
    get_cancel_use_case = Depends(get_cancel_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Cancel seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
    seminar = await get_cancel_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)
```

**Key points**:
- **NEW DEPENDENCY**: Add `get_one_use_case = Depends(get_seminar_use_case)` parameter
- For club admins: Fetch seminar and verify ownership before canceling
- For super admins: No check needed, proceed directly to cancel

---

### 6. DELETE /seminars/{seminar_id} Endpoint (Lines 111-119)

**Current behavior**: All authenticated users can delete any seminar.

**Required behavior**:
- Super admins: Can delete any seminar
- Club admins: Can only delete their own club's seminars

**Implementation:**

```python
@router.delete("/{seminar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seminar(
    seminar_id: str,
    get_delete_use_case = Depends(get_delete_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
    await get_delete_use_case.execute(seminar_id)
    return None
```

**Key points**:
- **NEW DEPENDENCY**: Add `get_one_use_case = Depends(get_seminar_use_case)` parameter
- Same ownership verification pattern as cancel
- Return `None` to satisfy 204 No Content status

---

## Important Notes About Existing Helpers

### AuthContext (from authorization.py)

Already available properties:
- `ctx.is_super_admin` → bool (True if user.global_role == GlobalRole.SUPER_ADMIN)
- `ctx.club_id` → Optional[str] (from linked member, None if no member)
- `ctx.has_club_access(club_id)` → bool (True for super admins or if club matches)

### check_club_access_ctx(ctx, club_id)

From `authorization.py:65-85`:
```python
def check_club_access_ctx(ctx: AuthContext, club_id: str) -> None:
    """
    Verify user has access to the specified club using AuthContext.

    Super admins have access to all clubs.
    Club admins only have access to their own club.

    Raises:
        HTTPException: 403 Forbidden if access denied
    """
    if ctx.has_club_access(club_id):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied to club {club_id}"
    )
```

**Key behavior**:
- Raises `HTTPException(403)` if access denied
- Super admins always pass (has_club_access returns True for any club_id)
- Club admins only pass if `club_id == ctx.club_id`
- Empty string `""` will fail for club admins (by design - seminars should have a club_id)

---

## Critical Implementation Details

### 1. Pattern: Check is_super_admin FIRST

Always use this pattern:
```python
if not ctx.is_super_admin:
    # Restrictions for club admins
else:
    # No restrictions (or different logic) for super admins
```

Never check `ctx.is_club_admin` - it's not needed. The logic is:
- If not super_admin → apply restrictions
- If super_admin → no restrictions

### 2. Dependency Injection for get_one_use_case

The dependency `get_seminar_use_case` is already imported at the top of the file:
```python
from src.infrastructure.web.dependencies import (
    get_all_seminars_use_case,
    get_seminar_use_case,  # <-- Already imported
    ...
)
```

Simply add it as a parameter in PUT/DELETE/CANCEL endpoints:
```python
get_one_use_case = Depends(get_seminar_use_case),
```

### 3. Why "get_one_use_case" instead of "get_seminar_use_case"?

Using the alias `get_one_use_case` avoids confusion with the dependency function name. Pattern:
- Dependency function: `get_seminar_use_case` (from dependencies.py)
- Injected variable: `get_one_use_case` (instance of GetSeminarUseCase)

This is consistent with how other use cases are named in the endpoint parameters.

### 4. Error Handling

No new exception types needed. The `check_club_access_ctx` helper already:
- Raises `HTTPException` with status 403
- Provides clear error message: "Access denied to club {club_id}"

If seminar doesn't exist, the use case will raise `SeminarNotFoundError`, which is already mapped to 404.

### 5. Why "existing.club_id or ''"?

```python
check_club_access_ctx(ctx, existing.club_id or "")
```

- `existing.club_id` is `Optional[str]` (can be None)
- `check_club_access_ctx` expects `str` parameter
- Using `or ""` provides empty string fallback
- Empty string will fail the access check for club admins (intentional - seminars should have club_id)
- Super admins still pass (they have access to all clubs, including "no club")

---

## Testing Strategy

### Manual Verification Steps

**After implementation, verify with:**

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run python -c "from src.infrastructure.web.routers.seminars import router; print('OK')"
```

Expected output: `OK`

If import fails, there's a syntax error or missing dependency.

### Demo Account Testing

**Club Admin Test** (director@aikido-madrid.es / demo123):
1. GET /seminars → Should only see their club's seminars
2. POST /seminars → Should create seminar with their club_id (regardless of request body)
3. PUT /seminars/{id} → Should only work for their club's seminars (403 for others)
4. DELETE /seminars/{id} → Should only work for their club's seminars (403 for others)
5. CANCEL /seminars/{id} → Should only work for their club's seminars (403 for others)

**Super Admin Test** (admin@spainaikikai.es / admin123):
1. GET /seminars → Should see all seminars from all clubs
2. POST /seminars → Should be able to set any club_id
3. PUT /seminars/{id} → Should work for any seminar, can change club_id
4. DELETE /seminars/{id} → Should work for any seminar
5. CANCEL /seminars/{id} → Should work for any seminar

### Expected HTTP Status Codes

- **200 OK**: Successful GET/PUT operations
- **201 Created**: Successful POST operation
- **204 No Content**: Successful DELETE operation
- **403 Forbidden**: Club admin trying to access another club's seminar
- **404 Not Found**: Seminar doesn't exist (from use case, not authorization)

---

## What NOT to Change

### ❌ DO NOT modify:

1. **Use cases** (`src/application/use_cases/`) - No changes needed, they're agnostic to authorization
2. **Repository** (`src/infrastructure/adapters/repositories/`) - No changes needed
3. **DTOs** (`src/infrastructure/web/dto/`) - Existing DTOs are fine
4. **Mappers** (`src/infrastructure/web/mappers_seminar.py`) - No changes needed
5. **Dependencies** (`src/infrastructure/web/dependencies.py`) - All needed dependencies exist
6. **Domain entities** (`src/domain/entities/`) - No changes needed

### ❌ DO NOT create:

1. New exception classes - Use existing `HTTPException` via `check_club_access_ctx`
2. New helper functions - All needed helpers exist in `authorization.py`
3. New dependencies - `get_seminar_use_case` already exists
4. New DTOs or response models - Existing ones are sufficient

### ❌ DO NOT change:

1. Function signatures' return types (keep `response_model=...` unchanged)
2. HTTP status codes (keep `status.HTTP_...` unchanged)
3. Function names or route paths
4. Docstrings (unless fixing typos)

---

## Common Pitfalls to Avoid

### 1. Don't use get_club_filter_ctx() for POST/PUT/DELETE

The `get_club_filter_ctx()` helper is designed for LIST operations. For mutations:
- POST: Override club_id directly
- PUT/DELETE: Use `check_club_access_ctx()` to verify ownership

### 2. Don't forget the "or ''" fallback

Always use `existing.club_id or ""` when passing to `check_club_access_ctx`:
```python
# ✅ Correct
check_club_access_ctx(ctx, existing.club_id or "")

# ❌ Wrong - type error if club_id is None
check_club_access_ctx(ctx, existing.club_id)
```

### 3. Don't check ctx.is_club_admin

You only need to check `ctx.is_super_admin`:
```python
# ✅ Correct
if not ctx.is_super_admin:
    # Apply restrictions

# ❌ Wrong - unnecessary complexity
if ctx.is_club_admin:
    # Apply restrictions
elif not ctx.is_super_admin:
    # What about regular users?
```

### 4. Don't fetch seminar twice

For PUT/DELETE/CANCEL, you only need to fetch once:
```python
# ✅ Correct
if not ctx.is_super_admin:
    existing = await get_one_use_case.execute(seminar_id)  # Fetch once
    check_club_access_ctx(ctx, existing.club_id or "")
# Then proceed with update/delete/cancel

# ❌ Wrong - wasteful double fetch
existing = await get_one_use_case.execute(seminar_id)
if not ctx.is_super_admin:
    check_club_access_ctx(ctx, existing.club_id or "")
```

### 5. Don't modify update_data for super admins

```python
# ✅ Correct
if not ctx.is_super_admin:
    update_data = seminar_data.model_dump(exclude_none=True)
    update_data.pop("club_id", None)  # Only for club admins
else:
    update_data = seminar_data.model_dump(exclude_none=True)

# ❌ Wrong - removes club_id for everyone
update_data = seminar_data.model_dump(exclude_none=True)
update_data.pop("club_id", None)  # Super admins can't change club!
```

---

## Success Criteria

### Code Quality
- [ ] Module imports without errors
- [ ] No new dependencies added
- [ ] No changes outside routers/seminars.py
- [ ] Consistent code style with existing patterns
- [ ] Clear comments for authorization logic

### Functionality
- [ ] Club admins see only their club's seminars on GET
- [ ] Club admins' seminars auto-assigned correct club_id on POST
- [ ] Club admins get 403 when trying to edit other clubs' seminars
- [ ] Club admins get 403 when trying to delete other clubs' seminars
- [ ] Club admins get 403 when trying to cancel other clubs' seminars
- [ ] Super admins retain full access to all operations
- [ ] Super admins can still change club_id on updates

### Security
- [ ] No way for club admin to bypass club_id filter on GET
- [ ] No way for club admin to create seminars for other clubs
- [ ] No way for club admin to change club_id on updates
- [ ] Authorization checks happen before use case execution
- [ ] Clear 403 error messages for access denied cases

---

## Summary

This implementation adds six strategic changes to one file:
1. **Import**: Add `check_club_access_ctx` to authorization imports
2. **GET**: Force filter by user's club_id for non-super-admins
3. **POST**: Auto-inject user's club_id for non-super-admins
4. **PUT**: Verify ownership and prevent club_id changes for non-super-admins
5. **CANCEL**: Verify ownership for non-super-admins
6. **DELETE**: Verify ownership for non-super-admins

All changes leverage existing helpers (`AuthContext`, `check_club_access_ctx`) and patterns (dependency injection, `ctx.is_super_admin` checks). No new exceptions, DTOs, or use cases needed.

The pattern is consistent with how other features (clubs, members, payments) implement authorization in this codebase.
