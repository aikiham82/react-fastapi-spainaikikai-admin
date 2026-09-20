# Context Session: Club Admin Members Fix

## Status: IMPLEMENTED & VERIFIED

## Bug Report
- **Symptom**: Club admin (`director@aikido-madrid.es`) sees "No hay miembros registrados" on members page
- **Expected**: Should see 7 members from their club
- **Dashboard**: Correctly shows 7 members (uses new AuthContext pattern)

## Root Cause
`members.py:46` uses deprecated `get_club_filter(current_user)` which calls `is_club_admin(user)` checking `user.role == "club_admin"`. The new role system uses `User.global_role = "user"` + `Member.club_role = "admin"`, so `is_club_admin()` returns False, and the function returns `"DENIED"` as club_id, yielding 0 results.

## Fix Applied
Migrated `backend/src/infrastructure/web/routers/members.py` from deprecated authorization pattern to `AuthContext`-based pattern:
- Replaced `get_current_active_user` → `get_auth_context` in all 7 endpoints
- Replaced `get_club_filter()` → `get_club_filter_ctx(ctx)`
- Replaced `check_club_access()` → `check_club_access_ctx(ctx, ...)`
- Replaced `is_club_admin(current_user)` → `ctx.is_club_admin`
- Replaced `current_user.club_id` → `ctx.club_id`
- Removed unused imports: `get_current_active_user`, `check_club_access`, `get_club_filter`, `is_club_admin`, `User`

## Verification Results
- All 371 backend tests pass
- Club admin API (`director@aikido-madrid.es`): returns **7 members** (was 0)
- Super admin API (`admin@spainaikikai.es`): returns **35 members** (unchanged)

## Out of Scope (follow-up tasks)
These routers still use the deprecated pattern and need migration:
- `insurances.py:81` - `get_club_filter(current_user)`
- `licenses.py:91,196` - `get_club_filter(current_user)`
