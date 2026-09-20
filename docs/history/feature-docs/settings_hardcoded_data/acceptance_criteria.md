# Acceptance Criteria: Settings Page Hardcoded Data Fix

## Feature Description
Fix the Settings/Configuration page to display the actual logged-in user's data instead of hardcoded values.

## User Story
As a logged-in user (either association_admin or club_admin),
I want to see my actual email and role on the Settings page,
So that I can verify my account information and understand my access level in the system.

## Acceptance Criteria

### AC1: Display Actual User Email
**Given** a user is logged into the system with valid credentials
**When** the user navigates to the Settings page (/settings)
**Then** the Settings page should display the user's actual email address under the "Perfil de Usuario" section
**And** the email should match the email used during authentication

### AC2: Display Translated Role for Association Admin
**Given** a user with role "association_admin" is logged in
**When** the user views the Settings page
**Then** the role field should display "Administrador" (Spanish translation)
**And** the role should be displayed under the "Perfil de Usuario" section next to the email

### AC3: Display Translated Role for Club Admin
**Given** a user with role "club_admin" is logged in
**When** the user views the Settings page
**Then** the role field should display "Admin de Club" (Spanish translation)
**And** the role should be displayed under the "Perfil de Usuario" section next to the email

### AC4: Fallback for Missing Data
**Given** user data is not available or cannot be retrieved
**When** the Settings page attempts to display user information
**Then** both email and role fields should display "No disponible" as fallback text
**And** the page should not crash or show undefined/null values

## Edge Cases

### Edge Case 1: Unknown Role Type
**Scenario**: User has a role that is not in the translations map
**Expected Behavior**: Display the raw role value without crashing

### Edge Case 2: Partial User Data
**Scenario**: User object exists but email or role is missing
**Expected Behavior**: Display "No disponible" for missing fields only

### Edge Case 3: Session Expiration
**Scenario**: User session expires while viewing the Settings page
**Expected Behavior**: User should be redirected to login, or data should show fallback values

## Non-Functional Requirements

### Performance
- User data should load immediately from auth context (no additional API calls)
- Page should render within 100ms after navigation

### Accessibility
- Email and role labels should be properly associated with their values
- Text should have sufficient color contrast (WCAG 2.1 AA)
- Screen readers should announce both label and value

### Security
- User data should only come from authenticated session
- No sensitive data should be logged to console
- Auth context should validate user data before providing it

## Technical Implementation Requirements

### Required Changes
1. Import `useAuthContext` hook from `@/features/auth/hooks/useAuthContext`
2. Define `roleTranslations` constant matching Sidebar implementation
3. Extract `currentUser` and `userRole` from auth context
4. Replace hardcoded email with `currentUser?.email ?? 'No disponible'`
5. Replace hardcoded role with translated role or fallback

### Files Modified
- `frontend/src/pages/settings.page.tsx`

## Test Scenarios

### Test Scenario 1: Association Admin Login
**Preconditions**:
- Backend is running on http://localhost:8000
- Frontend is running on http://localhost:5173
- Test user exists: admin@spainaikikai.org with role "association_admin"

**Steps**:
1. Navigate to http://localhost:5173/login
2. Enter email: admin@spainaikikai.org
3. Enter password: (correct password)
4. Click "Iniciar Sesión" button
5. Navigate to Settings page via sidebar or direct URL
6. Verify email displays: "admin@spainaikikai.org"
7. Verify role displays: "Administrador"

**Expected Result**: ✅ Pass

### Test Scenario 2: Club Admin Login
**Preconditions**:
- Backend is running on http://localhost:8000
- Frontend is running on http://localhost:5173
- Test user exists: aikifire@hotmail.com with role "club_admin"

**Steps**:
1. Navigate to http://localhost:5173/login
2. Enter email: aikifire@hotmail.com
3. Enter password: (correct password)
4. Click "Iniciar Sesión" button
5. Navigate to Settings page via sidebar or direct URL
6. Verify email displays: "aikifire@hotmail.com"
7. Verify role displays: "Admin de Club"

**Expected Result**: ✅ Pass

### Test Scenario 3: Direct Navigation After Login
**Preconditions**:
- User is already logged in (either role)

**Steps**:
1. Directly navigate to http://localhost:5173/settings
2. Verify user data is displayed correctly
3. Verify no hardcoded values are shown

**Expected Result**: ✅ Pass

### Test Scenario 4: Page Refresh on Settings
**Preconditions**:
- User is logged in and viewing Settings page

**Steps**:
1. On Settings page, perform browser refresh (F5)
2. Verify user data persists correctly
3. Verify no hardcoded values appear

**Expected Result**: ✅ Pass

## Definition of Done

- [ ] All acceptance criteria are met
- [ ] All test scenarios pass
- [ ] No hardcoded user data remains in the component
- [ ] Code follows project conventions (matches Sidebar.tsx pattern)
- [ ] Implementation uses auth context correctly
- [ ] Fallback handling is implemented
- [ ] No console errors when viewing Settings page
- [ ] Visual QA confirms proper display on different screen sizes
- [ ] Playwright automated tests validate the implementation

## Validation Method
- Manual testing with both user roles
- Playwright end-to-end tests
- Code review to ensure no hardcoded values
- Screenshot comparison before/after fix

## Success Metrics
- 100% of test scenarios pass
- No hardcoded values detected in rendered output
- User data matches authentication session in all cases
