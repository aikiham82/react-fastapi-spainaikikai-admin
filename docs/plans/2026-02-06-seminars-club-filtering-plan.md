# Seminars Club-Based Filtering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Club admins only see/create/edit/delete seminars belonging to their club. Super admins retain full access.

**Architecture:** Backend enforcement in the router layer using existing `AuthContext` helpers (`get_club_filter_ctx`, `check_club_access_ctx`). Frontend auto-injects `club_id` filter in the context hook and auto-assigns `club_id` on seminar creation.

**Tech Stack:** FastAPI (backend router), React + React Query (frontend context/form)

**Design doc:** `docs/plans/2026-02-06-seminars-club-filtering-design.md`

---

### Task 1: Backend — Enforce club filtering on GET /seminars

**Files:**
- Modify: `backend/src/infrastructure/web/routers/seminars.py:28-38`

**Step 1: Update the `get_seminars` endpoint**

Replace lines 28-38 with:

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

**Step 2: Add import for `check_club_access_ctx`**

At line 23-24, update imports from authorization:

```python
from src.infrastructure.web.authorization import AuthContext, check_club_access_ctx
```

**Step 3: Verify backend starts**

Run: `cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend && poetry run python -c "from src.infrastructure.web.routers.seminars import router; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/src/infrastructure/web/routers/seminars.py
git commit -m "feat(seminars): enforce club_id filter for club admins on GET /seminars"
```

---

### Task 2: Backend — Enforce club_id injection on POST /seminars

**Files:**
- Modify: `backend/src/infrastructure/web/routers/seminars.py:63-85`

**Step 1: Update the `create_seminar` endpoint**

Replace lines 63-85 with:

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

**Step 2: Commit**

```bash
git add backend/src/infrastructure/web/routers/seminars.py
git commit -m "feat(seminars): auto-inject club_id for club admins on POST /seminars"
```

---

### Task 3: Backend — Ownership check on PUT, DELETE, CANCEL

**Files:**
- Modify: `backend/src/infrastructure/web/routers/seminars.py:88-119`

**Step 1: Update the `update_seminar` endpoint (lines 88-97)**

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

**Step 2: Update the `cancel_seminar` endpoint (lines 100-108)**

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

**Step 3: Update the `delete_seminar` endpoint (lines 111-119)**

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

**Step 4: Verify backend starts**

Run: `cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend && poetry run python -c "from src.infrastructure.web.routers.seminars import router; print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add backend/src/infrastructure/web/routers/seminars.py
git commit -m "feat(seminars): add ownership check on update/delete/cancel for club admins"
```

---

### Task 4: Frontend — Auto-filter seminars by club in context

**Files:**
- Modify: `frontend/src/features/seminars/hooks/useSeminarContext.tsx`

**Step 1: Add auth import and compute effective filters**

Update the file — add `useMemo` to imports and `useAuthContext`:

```typescript
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useSeminarsQuery } from './queries/useSeminarQueries';
import { useCreateSeminarMutation, useUpdateSeminarMutation, useDeleteSeminarMutation, useRegisterMemberMutation } from './mutations/useSeminarMutations';
import type { Seminar, CreateSeminarRequest, UpdateSeminarRequest, SeminarFilters, RegisterMemberRequest } from '../data/schemas/seminar.schema';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
```

**Step 2: Add effective filters logic inside `SeminarProvider`**

After the `useState` for filters (line 27), add:

```typescript
const { clubId, userRole } = useAuthContext();

const effectiveFilters = useMemo(() => {
  if (userRole !== 'super_admin' && clubId) {
    return { ...filters, club_id: clubId };
  }
  return filters;
}, [filters, userRole, clubId]);
```

**Step 3: Use `effectiveFilters` instead of `filters` in the query**

Change line 29 from:
```typescript
const { data: seminarsData, isLoading, error } = useSeminarsQuery(filters);
```
To:
```typescript
const { data: seminarsData, isLoading, error } = useSeminarsQuery(effectiveFilters);
```

**Step 4: Verify frontend compiles**

Run: `cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/features/seminars/hooks/useSeminarContext.tsx
git commit -m "feat(seminars): auto-filter by club_id for club admins in context"
```

---

### Task 5: Frontend — Auto-assign club_id on seminar creation

**Files:**
- Modify: `frontend/src/features/seminars/components/SeminarForm.tsx`

**Step 1: Import useAuthContext**

Add at the top imports:

```typescript
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
```

**Step 2: Get auth context inside the component**

After line 24 (`const { createSeminar, updateSeminar } = useSeminarContext();`), add:

```typescript
const { clubId, userRole } = useAuthContext();
```

**Step 3: Inject club_id in handleSubmit**

Update the `handleSubmit` function (lines 114-135). Replace the `submitData` construction:

```typescript
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Format dates for backend (ISO 8601)
    const submitData: CreateSeminarRequest = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    // Auto-assign club_id for club admins
    if (userRole !== 'super_admin' && clubId) {
      submitData.club_id = clubId;
    }

    if (isEditing && seminar) {
      updateSeminar(seminar.id, submitData);
    } else {
      createSeminar(submitData);
    }

    onOpenChange(false);
  };
```

**Step 4: Verify frontend compiles**

Run: `cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/features/seminars/components/SeminarForm.tsx
git commit -m "feat(seminars): auto-inject club_id for club admins on seminar creation"
```

---

### Task 6: Manual verification

**Step 1: Start backend and frontend**

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend && poetry run uvicorn src.main:app --reload &
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/frontend && npm run dev &
```

**Step 2: Test as club admin**

1. Login as `director@aikido-madrid.es` / `demo123`
2. Navigate to Seminarios
3. Verify only seminars from that club appear (or empty list if none exist)
4. Create a seminar — verify it appears in the list
5. Edit/delete the seminar — verify it works

**Step 3: Test as super admin**

1. Login as `admin@spainaikikai.es` / `admin123`
2. Navigate to Seminarios
3. Verify ALL seminars appear (from all clubs)
4. Create/edit/delete — all should work without restriction

**Step 4: Final commit (if any adjustments needed)**
