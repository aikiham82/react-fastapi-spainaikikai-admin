# Playwright Validation Test Specification
## Seminars Club-Based Filtering

This document defines the automated Playwright tests to validate the seminars club-based filtering feature.

---

## Test Environment Setup

### Prerequisites
- Backend running on http://localhost:8000
- Frontend running on http://localhost:5173
- MongoDB populated with test data (see Test Data section)
- Both services healthy and accessible

### Test Configuration
```typescript
// playwright.config.ts
export default {
  baseURL: 'http://localhost:5173',
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
};
```

---

## Test Suite 1: Club Admin - Seminar List Filtering

### Test 1.1: Club Admin Sees Only Own Club Seminars
**Test ID**: `club-admin-list-filtering`
**Priority**: P0
**Acceptance Criteria**: AC-1

**Steps**:
```typescript
test('Club admin sees only own club seminars', async ({ page }) => {
  // Given: Login as club admin for Madrid
  await page.goto('/login');
  await page.fill('input[name="email"]', 'director@aikido-madrid.es');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // When: Navigate to Seminarios page
  await page.click('a[href="/seminarios"]');
  await page.waitForURL('/seminarios');
  await page.waitForLoadState('networkidle');

  // Then: Verify only Madrid seminars are visible
  const seminarCards = page.locator('[data-testid="seminar-card"]');
  const count = await seminarCards.count();

  expect(count).toBeGreaterThan(0); // At least one seminar exists

  // Verify all visible seminars are from Madrid club
  for (let i = 0; i < count; i++) {
    const seminarTitle = await seminarCards.nth(i).locator('h3').textContent();
    expect(seminarTitle).toContain('Madrid'); // Or verify via data attribute
  }

  // Verify Barcelona seminars are NOT visible
  const barcelonaSeminar = page.locator('text=Barcelona');
  await expect(barcelonaSeminar).toHaveCount(0);

  // Take screenshot for evidence
  await page.screenshot({ path: 'test-results/club-admin-list-view.png' });
});
```

**Pass Criteria**:
- At least one Madrid seminar is displayed
- No Barcelona seminars are displayed
- Page loads without errors

---

### Test 1.2: Club Admin with No Seminars Sees Empty List
**Test ID**: `club-admin-empty-list`
**Priority**: P1
**Acceptance Criteria**: AC-1 (Edge Case)

**Steps**:
```typescript
test('Club admin with no seminars sees empty state', async ({ page, request }) => {
  // Setup: Delete all Madrid seminars via API as super admin
  const superAdminToken = await getAuthToken('admin@spainaikikai.es', 'admin123');
  const seminars = await request.get('http://localhost:8000/seminars?club_id=club1_id', {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const seminarsData = await seminars.json();
  for (const seminar of seminarsData) {
    await request.delete(`http://localhost:8000/seminars/${seminar.id}`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
  }

  // Given: Login as club admin for Madrid
  await loginAsClubAdmin(page);

  // When: Navigate to Seminarios
  await page.goto('/seminarios');

  // Then: Verify empty state message
  await expect(page.locator('text=No hay seminarios')).toBeVisible();
  await page.screenshot({ path: 'test-results/club-admin-empty-list.png' });
});
```

**Pass Criteria**:
- Empty state message is displayed
- No seminar cards are visible
- Page doesn't show errors

---

## Test Suite 2: Club Admin - Seminar Creation

### Test 2.1: Club Admin Creates Seminar with Auto Club ID
**Test ID**: `club-admin-create-seminar`
**Priority**: P0
**Acceptance Criteria**: AC-2

**Steps**:
```typescript
test('Club admin creates seminar with auto-assigned club_id', async ({ page, request }) => {
  // Given: Login as club admin
  await loginAsClubAdmin(page);
  await page.goto('/seminarios');

  // When: Click create seminar button
  await page.click('button:has-text("Crear Seminario")');
  await expect(page.locator('dialog')).toBeVisible();

  // Verify no club selector is visible for club admin
  const clubSelect = page.locator('select[name="club_id"]');
  await expect(clubSelect).toHaveCount(0);

  // Fill form
  await page.fill('input[name="title"]', 'Test Seminar Auto Club');
  await page.fill('textarea[name="description"]', 'Test description');
  await page.fill('input[name="instructor_name"]', 'Sensei Test');
  await page.fill('input[name="venue"]', 'Test Venue');
  await page.fill('input[name="address"]', 'Test Address 123');
  await page.fill('input[name="city"]', 'Madrid');
  await page.fill('input[name="province"]', 'Madrid');
  await page.fill('input[name="start_date"]', '2026-06-01T10:00');
  await page.fill('input[name="end_date"]', '2026-06-01T18:00');
  await page.fill('input[name="price"]', '50');

  // Listen for API request
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/seminars') && req.method() === 'POST'),
    page.click('button[type="submit"]')
  ]);

  // Then: Verify request payload contains club_id
  const requestBody = request.postDataJSON();
  expect(requestBody.club_id).toBe('club1_id'); // Madrid club ID

  // Verify seminar appears in list
  await page.waitForURL('/seminarios');
  await expect(page.locator('text=Test Seminar Auto Club')).toBeVisible();

  await page.screenshot({ path: 'test-results/club-admin-create-seminar.png' });
});
```

**Pass Criteria**:
- Form doesn't show club selector for club admin
- POST request includes club_id matching admin's club
- Seminar is created and visible in list

---

## Test Suite 3: Club Admin - Edit/Delete Permissions

### Test 3.1: Club Admin Can Edit Own Seminar
**Test ID**: `club-admin-edit-own-seminar`
**Priority**: P0
**Acceptance Criteria**: AC-3

**Steps**:
```typescript
test('Club admin can edit own club seminar', async ({ page }) => {
  // Given: Login and navigate to seminars
  await loginAsClubAdmin(page);
  await page.goto('/seminarios');

  // When: Click edit on first seminar
  const firstSeminar = page.locator('[data-testid="seminar-card"]').first();
  await firstSeminar.locator('button:has-text("Editar")').click();

  // Verify form opens with existing data
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('h2:has-text("Editar Seminario")')).toBeVisible();

  // Modify title
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill('Updated Seminar Title');

  // Submit
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/seminars') && req.method() === 'PUT'),
    page.click('button[type="submit"]')
  ]);

  // Then: Verify request was successful
  const response = await request.response();
  expect(response?.status()).toBe(200);

  // Verify updated title appears in list
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=Updated Seminar Title')).toBeVisible();

  await page.screenshot({ path: 'test-results/club-admin-edit-success.png' });
});
```

**Pass Criteria**:
- Edit form opens successfully
- PUT request returns 200
- Updated data is visible in list

---

### Test 3.2: Club Admin Cannot Edit Other Club's Seminar
**Test ID**: `club-admin-cannot-edit-other-club`
**Priority**: P0
**Acceptance Criteria**: AC-4

**Steps**:
```typescript
test('Club admin cannot edit other club seminar', async ({ page, request }) => {
  // Given: Get Barcelona seminar ID (belongs to club2)
  const superAdminToken = await getAuthToken('admin@spainaikikai.es', 'admin123');
  const seminarsResponse = await request.get('http://localhost:8000/seminars?club_id=club2_id', {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const barcelonaSeminars = await seminarsResponse.json();
  const barcelonaSeminarId = barcelonaSeminars[0].id;

  // Login as Madrid club admin
  const madridToken = await getAuthToken('director@aikido-madrid.es', 'demo123');

  // When: Attempt to edit Barcelona seminar via API
  const editResponse = await request.put(
    `http://localhost:8000/seminars/${barcelonaSeminarId}`,
    {
      headers: { 'Authorization': `Bearer ${madridToken}` },
      data: { title: 'Hacked Title' }
    }
  );

  // Then: Verify 403 Forbidden
  expect(editResponse.status()).toBe(403);

  // Verify seminar title remains unchanged
  const verifyResponse = await request.get(
    `http://localhost:8000/seminars/${barcelonaSeminarId}`,
    { headers: { 'Authorization': `Bearer ${superAdminToken}` } }
  );
  const seminarData = await verifyResponse.json();
  expect(seminarData.title).not.toBe('Hacked Title');
});
```

**Pass Criteria**:
- API returns 403 Forbidden
- Seminar data remains unchanged
- No data leakage occurs

---

### Test 3.3: Club Admin Can Delete Own Seminar
**Test ID**: `club-admin-delete-own-seminar`
**Priority**: P0
**Acceptance Criteria**: AC-5

**Steps**:
```typescript
test('Club admin can delete own seminar', async ({ page }) => {
  // Given: Login and navigate to seminars
  await loginAsClubAdmin(page);
  await page.goto('/seminarios');

  // Get seminar count before deletion
  const initialCount = await page.locator('[data-testid="seminar-card"]').count();

  // When: Click delete on first seminar
  const firstSeminar = page.locator('[data-testid="seminar-card"]').first();
  const seminarTitle = await firstSeminar.locator('h3').textContent();

  await firstSeminar.locator('button:has-text("Eliminar")').click();

  // Confirm deletion in dialog
  await page.click('button:has-text("Confirmar")');

  // Wait for deletion to complete
  await page.waitForLoadState('networkidle');

  // Then: Verify seminar is removed
  const finalCount = await page.locator('[data-testid="seminar-card"]').count();
  expect(finalCount).toBe(initialCount - 1);

  // Verify deleted seminar is not visible
  await expect(page.locator(`text=${seminarTitle}`)).toHaveCount(0);

  await page.screenshot({ path: 'test-results/club-admin-delete-success.png' });
});
```

**Pass Criteria**:
- Seminar is removed from list
- DELETE request returns 204
- Seminar count decreases by 1

---

### Test 3.4: Club Admin Cannot Delete Other Club's Seminar
**Test ID**: `club-admin-cannot-delete-other-club`
**Priority**: P0
**Acceptance Criteria**: AC-6

**Steps**:
```typescript
test('Club admin cannot delete other club seminar', async ({ request }) => {
  // Given: Get Barcelona seminar ID
  const superAdminToken = await getAuthToken('admin@spainaikikai.es', 'admin123');
  const seminarsResponse = await request.get('http://localhost:8000/seminars?club_id=club2_id', {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const barcelonaSeminars = await seminarsResponse.json();
  const barcelonaSeminarId = barcelonaSeminars[0].id;

  // Login as Madrid club admin
  const madridToken = await getAuthToken('director@aikido-madrid.es', 'demo123');

  // When: Attempt to delete Barcelona seminar via API
  const deleteResponse = await request.delete(
    `http://localhost:8000/seminars/${barcelonaSeminarId}`,
    { headers: { 'Authorization': `Bearer ${madridToken}` } }
  );

  // Then: Verify 403 Forbidden
  expect(deleteResponse.status()).toBe(403);

  // Verify seminar still exists
  const verifyResponse = await request.get(
    `http://localhost:8000/seminars/${barcelonaSeminarId}`,
    { headers: { 'Authorization': `Bearer ${superAdminToken}` } }
  );
  expect(verifyResponse.status()).toBe(200);
});
```

**Pass Criteria**:
- API returns 403 Forbidden
- Seminar still exists in database
- No unauthorized deletion occurs

---

## Test Suite 4: Super Admin - Full Access

### Test 4.1: Super Admin Sees All Seminars
**Test ID**: `super-admin-sees-all-seminars`
**Priority**: P0
**Acceptance Criteria**: AC-9

**Steps**:
```typescript
test('Super admin sees all seminars from all clubs', async ({ page }) => {
  // Given: Login as super admin
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@spainaikikai.es');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // When: Navigate to Seminarios
  await page.goto('/seminarios');
  await page.waitForLoadState('networkidle');

  // Then: Verify seminars from multiple clubs are visible
  const madridSeminars = page.locator('text=/Madrid/i');
  const barcelonaSeminars = page.locator('text=/Barcelona/i');

  await expect(madridSeminars).toHaveCount(await madridSeminars.count()); // At least 1
  await expect(barcelonaSeminars).toHaveCount(await barcelonaSeminars.count()); // At least 1

  // Verify total count is sum of all clubs
  const totalSeminars = await page.locator('[data-testid="seminar-card"]').count();
  expect(totalSeminars).toBeGreaterThanOrEqual(2); // At least Madrid + Barcelona

  await page.screenshot({ path: 'test-results/super-admin-all-seminars.png' });
});
```

**Pass Criteria**:
- Seminars from multiple clubs are visible
- No filtering is applied by default
- All seminars are accessible

---

### Test 4.2: Super Admin Can Edit Any Seminar
**Test ID**: `super-admin-edit-any-seminar`
**Priority**: P0
**Acceptance Criteria**: AC-11

**Steps**:
```typescript
test('Super admin can edit seminar from any club', async ({ page, request }) => {
  // Given: Login as super admin
  await loginAsSuperAdmin(page);
  await page.goto('/seminarios');

  // Find Barcelona seminar (not super admin's club)
  const barcelonaSeminar = page.locator('[data-testid="seminar-card"]:has-text("Barcelona")').first();
  await barcelonaSeminar.locator('button:has-text("Editar")').click();

  // When: Modify and submit
  await page.fill('input[name="title"]', 'Super Admin Modified Barcelona');

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/seminars') && req.method() === 'PUT'),
    page.click('button[type="submit"]')
  ]);

  // Then: Verify success
  const response = await request.response();
  expect(response?.status()).toBe(200);

  await expect(page.locator('text=Super Admin Modified Barcelona')).toBeVisible();

  await page.screenshot({ path: 'test-results/super-admin-edit-any.png' });
});
```

**Pass Criteria**:
- Super admin can open edit form for any seminar
- PUT request succeeds (200)
- Changes are saved successfully

---

### Test 4.3: Super Admin Can Delete Any Seminar
**Test ID**: `super-admin-delete-any-seminar`
**Priority**: P0
**Acceptance Criteria**: AC-12

**Steps**:
```typescript
test('Super admin can delete seminar from any club', async ({ page }) => {
  // Given: Login as super admin
  await loginAsSuperAdmin(page);
  await page.goto('/seminarios');

  // Get initial count
  const initialCount = await page.locator('[data-testid="seminar-card"]').count();

  // When: Delete any seminar
  const firstSeminar = page.locator('[data-testid="seminar-card"]').first();
  await firstSeminar.locator('button:has-text("Eliminar")').click();
  await page.click('button:has-text("Confirmar")');

  await page.waitForLoadState('networkidle');

  // Then: Verify deletion
  const finalCount = await page.locator('[data-testid="seminar-card"]').count();
  expect(finalCount).toBe(initialCount - 1);
});
```

**Pass Criteria**:
- DELETE request succeeds (204)
- Seminar is removed from list
- No authorization errors

---

## Test Suite 5: Security & Authentication

### Test 5.1: Unauthenticated Access Returns 401
**Test ID**: `unauthenticated-access-blocked`
**Priority**: P0
**Acceptance Criteria**: AC-13

**Steps**:
```typescript
test('Unauthenticated user cannot access seminars API', async ({ request }) => {
  // Given: No authentication token

  // When: Attempt to access GET /seminars
  const getResponse = await request.get('http://localhost:8000/seminars');

  // Then: Verify 401
  expect(getResponse.status()).toBe(401);

  // When: Attempt POST
  const postResponse = await request.post('http://localhost:8000/seminars', {
    data: { title: 'Test' }
  });
  expect(postResponse.status()).toBe(401);

  // When: Attempt PUT
  const putResponse = await request.put('http://localhost:8000/seminars/test-id', {
    data: { title: 'Test' }
  });
  expect(putResponse.status()).toBe(401);

  // When: Attempt DELETE
  const deleteResponse = await request.delete('http://localhost:8000/seminars/test-id');
  expect(deleteResponse.status()).toBe(401);
});
```

**Pass Criteria**:
- All endpoints return 401 without auth token
- No data is exposed
- Error message is appropriate

---

### Test 5.2: Frontend Redirects Unauthenticated Users
**Test ID**: `frontend-auth-redirect`
**Priority**: P1
**Acceptance Criteria**: General security

**Steps**:
```typescript
test('Unauthenticated user is redirected to login', async ({ page }) => {
  // Given: No authentication
  await page.context().clearCookies();

  // When: Attempt to access /seminarios
  await page.goto('/seminarios');

  // Then: Verify redirect to login
  await page.waitForURL('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();
});
```

**Pass Criteria**:
- User is redirected to /login
- No seminar data is visible
- Login form is displayed

---

## Test Suite 6: Cross-Browser Validation

### Test 6.1: Feature Works in Chrome
**Test ID**: `chrome-compatibility`
**Priority**: P1
**Acceptance Criteria**: NFR-5

**Configuration**: Use Playwright's `chromium` project

**Steps**: Run Test Suites 1-5 in Chrome
**Pass Criteria**: All tests pass

---

### Test 6.2: Feature Works in Firefox
**Test ID**: `firefox-compatibility`
**Priority**: P1
**Acceptance Criteria**: NFR-5

**Configuration**: Use Playwright's `firefox` project

**Steps**: Run Test Suites 1-5 in Firefox
**Pass Criteria**: All tests pass

---

### Test 6.3: Feature Works in Safari (WebKit)
**Test ID**: `safari-compatibility`
**Priority**: P1
**Acceptance Criteria**: NFR-5

**Configuration**: Use Playwright's `webkit` project

**Steps**: Run Test Suites 1-5 in Safari/WebKit
**Pass Criteria**: All tests pass

---

## Test Utilities

### Utility: Login as Club Admin
```typescript
async function loginAsClubAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'director@aikido-madrid.es');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

### Utility: Login as Super Admin
```typescript
async function loginAsSuperAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@spainaikikai.es');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

### Utility: Get Auth Token
```typescript
async function getAuthToken(email: string, password: string): Promise<string> {
  const response = await request.post('http://localhost:8000/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.access_token;
}
```

---

## Test Execution Requirements

### Environment Checks (Pre-test)
1. Backend health: GET http://localhost:8000/health → 200
2. Frontend accessibility: GET http://localhost:5173 → 200
3. Database connectivity: MongoDB connection successful
4. Test data exists: Verify clubs, users, and seminars are seeded

### Test Data Seeding Script
```bash
# Run before executing tests
cd backend
poetry run python scripts/seed_test_data.py
```

### Cleanup Script
```bash
# Run after tests complete
cd backend
poetry run python scripts/cleanup_test_data.py
```

---

## Expected Test Results

### Test Coverage Goals
- **Functional Coverage**: 100% of acceptance criteria (AC-1 through AC-13)
- **Role Coverage**: Club Admin + Super Admin + Unauthenticated
- **Browser Coverage**: Chrome, Firefox, Safari (WebKit)
- **API Coverage**: All CRUD endpoints for seminars

### Pass/Fail Criteria
- **Pass**: All P0 tests pass, < 10% P1 failures
- **Conditional Pass**: All P0 pass, < 25% P1 failures (requires follow-up)
- **Fail**: Any P0 test fails, or > 25% P1 failures

### Performance Benchmarks (NFR-1)
- GET /seminars response time: < 500ms (median)
- Page load time: < 2 seconds
- Form submission: < 1 second

---

## Test Evidence Collection

### Artifacts to Capture
1. **Screenshots**: On failure + key validation points
2. **Video**: Full test execution for failed tests
3. **Network Logs**: API requests/responses for debugging
4. **Console Logs**: Browser console errors
5. **Performance Metrics**: Response times, page load times

### Report Structure
```
test-results/
├── screenshots/
│   ├── club-admin-list-view.png
│   ├── club-admin-create-seminar.png
│   └── ...
├── videos/
│   ├── test-1-failure.webm
│   └── ...
├── traces/
│   └── trace.zip (Playwright trace for debugging)
├── coverage.json
└── report.html (Test execution summary)
```

---

## Notes for Test Execution

### Important Considerations
1. **Test Isolation**: Each test should be independent (use setup/teardown)
2. **Data Cleanup**: Reset database state between test suites
3. **Timeouts**: Allow sufficient time for API calls and navigation
4. **Flakiness**: Retry failed tests once before marking as failure
5. **Parallel Execution**: Tests can run in parallel within same browser
6. **Cross-Browser**: Run sequentially across browsers to avoid conflicts

### Known Limitations
- Tests assume specific club_id values (club1_id, club2_id)
- Test users must exist in database with correct roles
- Network latency may affect timing-sensitive tests
- Browser-specific rendering may cause minor visual differences

### Troubleshooting
- If login fails: Verify user credentials in database
- If seminars not visible: Check club_id associations
- If 403 errors unexpected: Verify JWT token contains correct claims
- If timeouts occur: Increase `timeout` in Playwright config
