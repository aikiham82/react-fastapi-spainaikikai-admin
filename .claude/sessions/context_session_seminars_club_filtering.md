# Session: Seminars Club-Based Filtering

## Status: COMPLETE - All implementation and review fixes applied

## Decisions
- Club admins see only their club's seminars; super_admins see all
- club_id auto-assigned on create for club admins (no form field)
- Backend enforcement: forced filter on GET, ownership check on PUT/DELETE/CANCEL
- Edit/delete restricted to own club's seminars (403 if mismatch)

## Implementation Summary

### Backend (`backend/src/infrastructure/web/routers/seminars.py`)
- `GET /seminars` — Forces club_id filter for non-super_admin
- `GET /upcoming` — Moved BEFORE `/{seminar_id}` (route ordering fix), filters by club for non-super_admin
- `GET /{seminar_id}` — Added ownership check for non-super_admin (security fix from review)
- `POST /seminars` — Injects club_id from auth context for non-super_admin
- `PUT /seminars/{id}` — Ownership check + strips club_id from update data
- `PUT /seminars/{id}/cancel` — Ownership check
- `DELETE /seminars/{id}` — Ownership check

### Frontend
- `useSeminarContext.tsx` — Auto-adds club_id to filters via useMemo for non-super_admin
- `SeminarForm.tsx` — Auto-injects club_id on create only (not edit) for non-super_admin
- `seminar.schema.ts` — Added club_id to SeminarFilters interface

## Review Fixes Applied
1. Added ownership check on `GET /{seminar_id}` (security gap)
2. Moved `/upcoming` route before `/{seminar_id}` (route ordering bug)
3. Added club filtering on `/upcoming` for non-super_admin
4. Tightened frontend to only inject club_id on create, not edit

## Files Modified
1. `backend/src/infrastructure/web/routers/seminars.py`
2. `frontend/src/features/seminars/hooks/useSeminarContext.tsx`
3. `frontend/src/features/seminars/components/SeminarForm.tsx`
4. `frontend/src/features/seminars/data/schemas/seminar.schema.ts`

## Plan Documents
- Design: `docs/plans/2026-02-06-seminars-club-filtering-design.md`
- Implementation: `docs/plans/2026-02-06-seminars-club-filtering-plan.md`
