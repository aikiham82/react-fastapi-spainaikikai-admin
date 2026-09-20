# ⚠️ CRITICAL SECURITY FIXES REQUIRED

**Feature**: Seminars Club-Based Filtering
**Date**: 2026-02-06
**Severity**: HIGH - Information Disclosure Vulnerability

---

## Overview

The seminars club-based filtering implementation is **98% complete** but has **2 critical security gaps** that must be fixed before the feature can be tested or deployed.

**Time to Fix**: ~15 minutes
**Impact if Not Fixed**: Club admins can view seminars from other clubs

---

## 🔴 Critical Issue #1: GET /seminars/{id} - Missing Authorization

### Location
**File**: `backend/src/infrastructure/web/routers/seminars.py`
**Lines**: 47-55

### Current Code
```python
@router.get("/{seminar_id}", response_model=SeminarResponse)
async def get_seminar(
    seminar_id: str,
    get_seminar_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get seminar by ID."""
    seminar = await get_seminar_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)
```

### Problem
Club admins can access individual seminar details from other clubs by directly calling the API with the seminar ID (e.g., `GET /seminars/{other_club_seminar_id}`).

### Attack Scenario
1. Club Admin from Madrid logs in
2. Somehow obtains seminar ID from Barcelona club (via URL sharing, guessing, etc.)
3. Makes API call: `GET /seminars/{barcelona_seminar_id}`
4. Successfully retrieves Barcelona seminar details (should be forbidden)

### Required Fix
```python
@router.get("/{seminar_id}", response_model=SeminarResponse)
async def get_seminar(
    seminar_id: str,
    get_seminar_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get seminar by ID."""
    seminar = await get_seminar_use_case.execute(seminar_id)

    # ADD THIS: Verify ownership for club admins
    if not ctx.is_super_admin:
        check_club_access_ctx(ctx, seminar.club_id or "")

    return SeminarMapper.to_response_dto(seminar)
```

### Lines to Add
Add after line 54:
```python
    # Verify ownership for club admins
    if not ctx.is_super_admin:
        check_club_access_ctx(ctx, seminar.club_id or "")
```

### Expected Behavior After Fix
- Super admin: Can view any seminar ✅
- Club admin: Can view own club's seminars ✅
- Club admin: Gets 403 Forbidden when accessing other club's seminar ✅

---

## 🔴 Critical Issue #2: GET /upcoming - No Filtering Applied

### Location
**File**: `backend/src/infrastructure/web/routers/seminars.py`
**Lines**: 58-66

### Current Code
```python
@router.get("/upcoming", response_model=List[SeminarResponse])
async def get_upcoming_seminars(
    limit: int = 100,
    get_upcoming_use_case = Depends(get_upcoming_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get upcoming seminars."""
    seminars = await get_upcoming_use_case.execute(limit)
    return SeminarMapper.to_response_list(seminars)
```

### Problem
Returns ALL upcoming seminars from ALL clubs to everyone (including club admins who should only see their own).

### Attack Scenario
1. Club Admin from Madrid logs in
2. Makes API call: `GET /seminars/upcoming`
3. Receives upcoming seminars from ALL clubs (should only see Madrid)
4. Information leakage: sees competitor clubs' events, dates, instructors, pricing

### Required Fix (Option A - Post-filtering)
```python
@router.get("/upcoming", response_model=List[SeminarResponse])
async def get_upcoming_seminars(
    limit: int = 100,
    get_upcoming_use_case = Depends(get_upcoming_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get upcoming seminars."""
    seminars = await get_upcoming_use_case.execute(limit)

    # ADD THIS: Filter results for club admins
    if not ctx.is_super_admin:
        if ctx.club_id:
            seminars = [s for s in seminars if s.club_id == ctx.club_id]
        else:
            seminars = []

    return SeminarMapper.to_response_list(seminars)
```

### Lines to Add
Add after line 65:
```python
    # Filter results for club admins
    if not ctx.is_super_admin:
        if ctx.club_id:
            seminars = [s for s in seminars if s.club_id == ctx.club_id]
        else:
            seminars = []
```

### Alternative Fix (Option B - Use Case Modification)
Modify `GetUpcomingSeminarsUseCase` to accept optional `club_id` parameter, then:
```python
@router.get("/upcoming", response_model=List[SeminarResponse])
async def get_upcoming_seminars(
    limit: int = 100,
    get_upcoming_use_case = Depends(get_upcoming_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get upcoming seminars."""
    # Pass club_id for club admins, None for super admins
    club_filter = ctx.club_id if not ctx.is_super_admin else None
    seminars = await get_upcoming_use_case.execute(limit, club_id=club_filter)
    return SeminarMapper.to_response_list(seminars)
```

**Recommendation**: Use Option A (post-filtering) for quick fix, then refactor to Option B later for efficiency.

### Expected Behavior After Fix
- Super admin: Sees upcoming seminars from all clubs ✅
- Club admin: Sees only upcoming seminars from own club ✅
- Club admin without club_id: Sees empty list ✅

---

## Testing After Fixes

### Manual API Test #1: GET /seminars/{id}
```bash
# 1. Login as club admin (Madrid)
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@aikido-madrid.es","password":"demo123"}' \
  | jq -r '.access_token')

# 2. Get a Barcelona seminar ID (as super admin)
SUPER_TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spainaikikai.es","password":"admin123"}' \
  | jq -r '.access_token')

BARCELONA_ID=$(curl http://localhost:8000/seminars?club_id=club2_id \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  | jq -r '.[0].id')

# 3. Try to access Barcelona seminar as Madrid admin (should fail with 403)
curl -X GET http://localhost:8000/seminars/$BARCELONA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

# Expected: HTTP Status: 403
```

### Manual API Test #2: GET /upcoming
```bash
# 1. Login as club admin (Madrid)
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@aikido-madrid.es","password":"demo123"}' \
  | jq -r '.access_token')

# 2. Get upcoming seminars (should only show Madrid)
curl http://localhost:8000/seminars/upcoming \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.[] | {id, title, club_id}'

# Expected: Only seminars with club_id matching Madrid's club
```

---

## Impact Assessment

### If Not Fixed
- **Confidentiality**: 🔴 HIGH - Club admins can view competitor data
- **Integrity**: 🟢 LOW - No data modification possible
- **Availability**: 🟢 LOW - No DoS risk
- **Compliance**: 🔴 HIGH - Violates data access requirements

### After Fixing
- **Confidentiality**: ✅ Protected - Club admins isolated
- **Integrity**: ✅ Protected - No change
- **Availability**: ✅ Protected - No change
- **Compliance**: ✅ Met - Access control enforced

---

## Checklist Before Testing

- [ ] Issue #1: Add ownership check to GET /seminars/{id}
- [ ] Issue #2: Add filtering to GET /upcoming
- [ ] Test manually with curl (commands provided above)
- [ ] Verify 403 returned for unauthorized access
- [ ] Verify only own club's data visible to club admins
- [ ] Verify super admin still has full access
- [ ] Commit changes with message: "fix: Add authorization checks to seminar detail and upcoming endpoints"

---

## Estimated Impact

**Files to Modify**: 1 file (`seminars.py`)
**Lines to Add**: ~10 lines
**Estimated Time**: 15 minutes
**Risk Level**: Low (adding security, not changing functionality)
**Breaking Changes**: None (only restricts unauthorized access)

---

## After Fixes Are Complete

1. Update `.claude/doc/seminars_club_filtering/feedback_report.md` to mark issues as resolved
2. Run Playwright validation test suite
3. Review test results
4. Address any additional findings
5. Mark feature as ready for production

---

## Contact

If you have questions about these fixes, refer to:
- **Full validation report**: `.claude/doc/seminars_club_filtering/feedback_report.md`
- **Acceptance criteria**: `.claude/doc/seminars_club_filtering/acceptance_criteria.md`
- **Test specification**: `.claude/doc/seminars_club_filtering/playwright_test_spec.md`
- **Session context**: `.claude/sessions/context_session_seminars_club_filtering.md`

---

**Priority**: 🔴 CRITICAL - Fix before any testing or deployment
**Estimated Effort**: ⏱️ 15 minutes
**Impact**: 🛡️ Closes information disclosure vulnerability
