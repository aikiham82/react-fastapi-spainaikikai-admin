# Testing Quick Start Guide
## Seminars Club-Based Filtering

**Purpose**: Quick reference for testing the seminars club-based filtering feature
**Prerequisites**: Critical fixes applied, services running, test data seeded

---

## Pre-Test Checklist

### Environment
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] MongoDB running and accessible
- [ ] Critical security fixes applied (see CRITICAL_FIXES_REQUIRED.md)

### Test Data
- [ ] Club 1 exists: Aikido Madrid (id: club1_id)
- [ ] Club 2 exists: Aikido Barcelona (id: club2_id)
- [ ] Super admin account: admin@spainaikikai.es / admin123
- [ ] Club admin 1: director@aikido-madrid.es / demo123
- [ ] Club admin 2: director@aikido-barcelona.es / demo123
- [ ] At least 2 seminars for Madrid
- [ ] At least 2 seminars for Barcelona

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:5173

# Login test
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spainaikikai.es","password":"admin123"}'
```

---

## Manual Testing Scenarios

### Test 1: Club Admin - List View (2 min)
**Expected Result**: Only own club's seminars visible

1. Open http://localhost:5173/login
2. Login: `director@aikido-madrid.es` / `demo123`
3. Navigate to: Seminarios
4. **Verify**: Only Madrid seminars visible
5. **Verify**: No Barcelona seminars visible
6. Check browser console for errors (should be none)

**Pass**: ✅ Only Madrid seminars visible
**Fail**: ❌ Barcelona seminars visible OR errors in console

---

### Test 2: Club Admin - Create Seminar (3 min)
**Expected Result**: Seminar created with auto-assigned club_id

1. While logged in as Madrid admin
2. Click "Crear Seminario"
3. Fill form:
   - Title: "Test Seminar QA"
   - Instructor: "Sensei Test"
   - Venue: "Test Venue"
   - Address: "Test Address 123"
   - City: "Madrid"
   - Province: "Madrid"
   - Start Date: (any future date)
   - End Date: (same day, later time)
   - Price: 50
4. Submit
5. **Verify**: Seminar appears in list
6. Open browser DevTools → Network → Find POST /seminars request
7. **Verify**: Request payload includes `"club_id": "club1_id"`

**Pass**: ✅ Seminar created, club_id auto-assigned
**Fail**: ❌ Creation failed OR club_id not present OR wrong club_id

---

### Test 3: Club Admin - Edit Own Seminar (2 min)
**Expected Result**: Edit succeeds

1. While logged in as Madrid admin
2. Click "Editar" on any Madrid seminar
3. Change title to "Updated Title QA Test"
4. Submit
5. **Verify**: Update succeeds, new title visible

**Pass**: ✅ Edit succeeds
**Fail**: ❌ Edit fails with error

---

### Test 4: Club Admin - Delete Own Seminar (2 min)
**Expected Result**: Delete succeeds

1. While logged in as Madrid admin
2. Click "Eliminar" on any Madrid seminar
3. Confirm deletion
4. **Verify**: Seminar removed from list

**Pass**: ✅ Delete succeeds
**Fail**: ❌ Delete fails with error

---

### Test 5: Club Admin - Cannot Access Other Club (3 min)
**Expected Result**: 403 Forbidden

**Via API**:
```bash
# 1. Get Madrid admin token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@aikido-madrid.es","password":"demo123"}' \
  | jq -r '.access_token')

# 2. Get Barcelona seminar ID (as super admin)
SUPER_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spainaikikai.es","password":"admin123"}' \
  | jq -r '.access_token')

BARCELONA_ID=$(curl -s http://localhost:8000/seminars?club_id=club2_id \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  | jq -r '.[0].id')

echo "Barcelona Seminar ID: $BARCELONA_ID"

# 3. Try to access as Madrid admin (should get 403)
curl -s -X GET http://localhost:8000/seminars/$BARCELONA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

# 4. Try to edit as Madrid admin (should get 403)
curl -s -X PUT http://localhost:8000/seminars/$BARCELONA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 5. Try to delete as Madrid admin (should get 403)
curl -s -X DELETE http://localhost:8000/seminars/$BARCELONA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Pass**: ✅ All requests return 403
**Fail**: ❌ Any request succeeds (200/204)

---

### Test 6: Super Admin - Full Access (3 min)
**Expected Result**: Super admin sees all, can modify all

1. Logout
2. Login: `admin@spainaikikai.es` / `admin123`
3. Navigate to: Seminarios
4. **Verify**: Both Madrid and Barcelona seminars visible
5. Click "Editar" on a Barcelona seminar
6. Change title
7. **Verify**: Edit succeeds
8. **Verify**: Change visible in list

**Pass**: ✅ Super admin can view and edit all seminars
**Fail**: ❌ Limited view or edit failures

---

### Test 7: Unauthenticated Access (1 min)
**Expected Result**: 401 Unauthorized

```bash
# Try to access without token
curl -s http://localhost:8000/seminars -w "\nHTTP Status: %{http_code}\n"

# Expected: HTTP Status: 401
```

**Pass**: ✅ Returns 401
**Fail**: ❌ Returns data (200)

---

### Test 8: GET /upcoming Filtering (2 min)
**Expected Result**: Club admin sees only own upcoming seminars

```bash
# 1. Get Madrid admin token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@aikido-madrid.es","password":"demo123"}' \
  | jq -r '.access_token')

# 2. Get upcoming seminars
curl -s http://localhost:8000/seminars/upcoming \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.[] | {id, title, club_id}'

# 3. Verify: All results have club_id = "club1_id" (Madrid)
```

**Pass**: ✅ Only Madrid seminars returned
**Fail**: ❌ Barcelona seminars in results

---

## Automated Testing with Playwright

### Setup
```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

### Run Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/seminars-club-filtering.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View Report
```bash
npx playwright show-report
```

---

## Test Results Template

### Manual Test Results
Date: ________
Tester: ________

| Test | Expected | Result | Notes |
|------|----------|--------|-------|
| 1. Club Admin List | Only own seminars | ☐ Pass ☐ Fail | |
| 2. Create with Auto ID | Seminar created | ☐ Pass ☐ Fail | |
| 3. Edit Own | Edit succeeds | ☐ Pass ☐ Fail | |
| 4. Delete Own | Delete succeeds | ☐ Pass ☐ Fail | |
| 5. Cannot Access Other | 403 errors | ☐ Pass ☐ Fail | |
| 6. Super Admin Access | Full access | ☐ Pass ☐ Fail | |
| 7. Unauthenticated | 401 error | ☐ Pass ☐ Fail | |
| 8. Upcoming Filtering | Filtered results | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ All Pass ☐ Some Failures ☐ Blocked

**Blocker Issues**:
-
-

**Notes**:
-
-

---

## Playwright Test Results Summary

```bash
# After running: npx playwright test

# Check summary:
#   X passed (green)
#   Y failed (red)
#   Z skipped (yellow)

# Review failed tests:
npx playwright show-report

# View screenshots:
ls test-results/screenshots/

# View videos:
ls test-results/videos/
```

---

## Common Issues & Troubleshooting

### Issue: Backend returns 500 instead of 403
**Cause**: `check_club_access_ctx` might be raising wrong exception
**Fix**: Check backend logs, verify exception handling

### Issue: Frontend shows all seminars to club admin
**Cause**: Frontend filtering not working
**Check**:
1. `useAuthContext` returns correct `clubId` and `userRole`
2. `useSeminarContext` applies `effectiveFilters`
3. React Query cache - try hard refresh

### Issue: Tests are flaky
**Cause**: Race conditions, timing issues
**Fix**:
1. Add explicit waits: `await page.waitForLoadState('networkidle')`
2. Use data-testid attributes instead of text selectors
3. Increase timeouts in playwright.config.ts

### Issue: Can't login during tests
**Cause**: Test users don't exist or wrong credentials
**Fix**: Verify test users in database, check password hashing

### Issue: "No seminars" shown when there should be
**Cause**: club_id mismatch in database
**Fix**: Verify seminar documents have correct club_id values

---

## Quick Debugging Commands

### Check Current User Context
```bash
TOKEN="<your_jwt_token>"
curl -s http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{email, global_role, club_id, club_role}'
```

### List All Seminars (Super Admin)
```bash
SUPER_TOKEN="<super_admin_jwt_token>"
curl -s http://localhost:8000/seminars?limit=100 \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  | jq '.[] | {id, title, club_id}'
```

### Check Backend Logs
```bash
# If running with uvicorn directly
# Check terminal output

# If running with docker
docker logs <container_id> --tail 100 -f
```

### Check MongoDB Data
```bash
# Connect to MongoDB
mongosh spainaikikai

# List clubs
db.clubs.find({}, {name: 1, _id: 1})

# List seminars with club associations
db.seminars.find({}, {title: 1, club_id: 1})

# Count seminars per club
db.seminars.aggregate([
  { $group: { _id: "$club_id", count: { $sum: 1 } } }
])
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Update feedback report with test results
2. Mark feature as validated
3. Prepare for production deployment
4. Document any edge cases discovered

### If Tests Fail ❌
1. Document failures with screenshots
2. Create bug reports with reproduction steps
3. Prioritize fixes (P0 = blocking, P1 = important, P2 = minor)
4. Fix issues and re-test
5. Update feedback report

---

## Reference Documents

- **Acceptance Criteria**: `.claude/doc/seminars_club_filtering/acceptance_criteria.md`
- **Playwright Test Spec**: `.claude/doc/seminars_club_filtering/playwright_test_spec.md`
- **Validation Report**: `.claude/doc/seminars_club_filtering/feedback_report.md`
- **Critical Fixes**: `.claude/doc/seminars_club_filtering/CRITICAL_FIXES_REQUIRED.md`
- **Session Context**: `.claude/sessions/context_session_seminars_club_filtering.md`

---

**Estimated Testing Time**:
- Manual: 20-30 minutes
- Playwright: 30-60 minutes (including setup)
- Total: 1-1.5 hours

**Good Luck with Testing!** 🚀
