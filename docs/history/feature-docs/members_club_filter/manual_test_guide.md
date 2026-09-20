# Manual Testing Guide: Members Club Filter

This guide provides step-by-step instructions for manually testing the Members Club Filter feature in a browser.

---

## Prerequisites

### 1. Start the Application
```bash
# Terminal 1: Start Backend
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run uvicorn src.main:app --reload

# Terminal 2: Start Frontend
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/frontend
npm run dev
```

### 2. Open Browser
Navigate to: http://localhost:5173

---

## Test Session 1: Super Admin Features

### Setup
1. Navigate to http://localhost:5173
2. Login with:
   - **Email**: `admin@spainaikikai.org` ← NOTE: .org not .es
   - **Password**: `admin123`
3. Click on "Miembros" in the sidebar

---

### Test 1.1: Verify Club Column Exists

**Steps**:
1. Look at the desktop table (if on mobile, resize browser to desktop width)
2. Locate the table header row

**Expected Result**:
- ✓ Table should have these columns in order:
  1. Nombre
  2. Email
  3. **Club** ← This one!
  4. Grado
  5. Seguro RC
  6. Seguro Acc.
  7. Pagos
  8. Acciones

**Pass/Fail**: _______

---

### Test 1.2: Verify Club Names Are Displayed

**Steps**:
1. Look at the "Club" column cells
2. Check first 5-10 rows

**Expected Result**:
- ✓ Most cells should show actual club names (e.g., "Dojo Heijoshin", "Alpujarra Aikikai")
- ✓ Not showing "-" for most members
- ✓ Club names are underlined (indicating they're clickable)

**Pass/Fail**: _______

---

### Test 1.3: Verify Club Filter Exists

**Steps**:
1. Look at the filter row (top of the page, below "Miembros" heading)
2. Count the filter controls from left to right

**Expected Result**:
- ✓ Should see these controls in order:
  1. Search box ("Buscar miembros por nombre...")
  2. Member status dropdown ("Activos")
  3. License status dropdown ("Todos")
  4. **Club filter dropdown** ("Filtrar por club") ← This one!
  5. "Nuevo Miembro" button

**Pass/Fail**: _______

---

### Test 1.4: Open Club Filter Dropdown

**Steps**:
1. Click on the "Filtrar por club" dropdown
2. Wait for popup to appear

**Expected Result**:
- ✓ Popup appears with search box at top
- ✓ First option is "Todos los clubs"
- ✓ Below that, a list of club names appears (e.g., Alpujarra Aikikai, Granada Aikikai, etc.)
- ✓ Should see 5+ clubs in the list

**Pass/Fail**: _______

---

### Test 1.5: Filter by Selecting a Club

**Steps**:
1. In the club filter dropdown, click on "Alpujarra Aikikai" (or any other club)
2. Wait for page to update

**Expected Result**:
- ✓ Dropdown closes
- ✓ A badge appears below the filter row showing "Club: Alpujarra Aikikai" with an × button
- ✓ Table shows only members from Alpujarra Aikikai
- ✓ All rows in "Club" column should show "Alpujarra Aikikai"
- ✓ Member count at bottom updates (e.g., "Mostrando 1-25 de 25 miembros")

**Pass/Fail**: _______

---

### Test 1.6: Click Club Name in Table

**Steps**:
1. Clear any active filters first (click × on badge if present, or select "Todos los clubs")
2. Find a member row where club name is different (e.g., "Granada Aikikai")
3. Click on that club name in the Club column

**Expected Result**:
- ✓ Page filters to show only members from that club
- ✓ Filter badge appears: "Club: Granada Aikikai"
- ✓ Club filter dropdown updates to show selected club
- ✓ All visible members belong to Granada Aikikai

**Pass/Fail**: _______

---

### Test 1.7: Clear Filter Using × Button

**Steps**:
1. Ensure a club filter is active (badge visible)
2. Click the × button on the "Club: [name]" badge
3. Wait for page to update

**Expected Result**:
- ✓ Badge disappears
- ✓ Table shows members from all clubs again
- ✓ Club filter dropdown resets to "Filtrar por club"
- ✓ Member count increases

**Pass/Fail**: _______

---

### Test 1.8: Clear Filter Using "Todos los clubs"

**Steps**:
1. Filter by a club (any club)
2. Open the club filter dropdown
3. Click "Todos los clubs" (first option)
4. Wait for page to update

**Expected Result**:
- ✓ Badge disappears
- ✓ Table shows members from all clubs
- ✓ Filter is cleared

**Pass/Fail**: _______

---

### Test 1.9: Search in Club Filter

**Steps**:
1. Open club filter dropdown
2. Type "alpu" in the search box

**Expected Result**:
- ✓ List filters to show only clubs matching "alpu"
- ✓ "Alpujarra Aikikai" should be visible
- ✓ Other non-matching clubs should be hidden
- ✓ Clicking filtered club should work normally

**Pass/Fail**: _______

---

### Test 1.10: Empty State - Club with No Members

**Steps**:
1. Filter by a club that has no members (try different clubs until you find one with 0 members)
   - OR: Note the club ID of any club, then use MongoDB to temporarily move all members to other clubs
2. Observe the page

**Expected Result**:
- ✓ Empty state appears with:
  - Users icon
  - Message: "No se encontraron miembros en este club"
  - Button: "Limpiar filtro"
- ✓ Clicking "Limpiar filtro" clears the filter and shows all members

**Pass/Fail**: _______

---

### Test 1.11: Mobile View - Club Names Visible

**Steps**:
1. Resize browser to mobile width (< 768px) or use browser dev tools device emulation
2. Look at member cards

**Expected Result**:
- ✓ Each member card shows a line with club name
- ✓ Format: "[Club Name] | Grado: [Grade]"
- ✓ Club name is underlined (clickable)
- ✓ Separator pipe (|) appears after club name

**Pass/Fail**: _______

---

### Test 1.12: Mobile View - Click Club Name

**Steps**:
1. Stay in mobile view
2. Find a member card with a club name
3. Click on the club name

**Expected Result**:
- ✓ Page filters to that club
- ✓ Filter badge appears above cards
- ✓ Only members from that club are visible

**Pass/Fail**: _______

---

### Test 1.13: Pagination with Filter

**Steps**:
1. Clear all filters
2. Filter by a club with many members (>100)
3. Check pagination controls at bottom

**Expected Result**:
- ✓ Pagination works correctly
- ✓ All pages show only members from filtered club
- ✓ Filter badge remains visible when navigating pages

**Pass/Fail**: _______

---

### Test 1.14: Combined Filters

**Steps**:
1. Search for a name (e.g., "Garcia")
2. Set member status to "Activos"
3. Filter by a club

**Expected Result**:
- ✓ All filters work together
- ✓ Shows only active members, from selected club, matching search term
- ✓ Club filter badge visible
- ✓ Clearing club filter keeps other filters active

**Pass/Fail**: _______

---

## Test Session 2: Club Admin Restrictions

### Setup
1. Logout (if logged in as super admin)
2. Login with club admin credentials:
   - **Email**: `director@aikido-madrid.es` (or another club admin account)
   - **Password**: `demo123`
   - **NOTE**: If this account doesn't exist, you may need to:
     - Check other accounts in the database
     - Or create a club admin test account
3. Click on "Miembros" in the sidebar

---

### Test 2.1: Club Column NOT Visible

**Steps**:
1. Look at the desktop table header row
2. Count the columns

**Expected Result**:
- ✓ Table should have these columns:
  1. Nombre
  2. Email
  3. Grado ← (Club column should NOT be here)
  4. Seguro RC
  5. Seguro Acc.
  6. Pagos
  7. Acciones
- ✓ NO "Club" column header visible

**Pass/Fail**: _______

---

### Test 2.2: Club Filter NOT Visible

**Steps**:
1. Look at the filter row
2. Count the filter controls

**Expected Result**:
- ✓ Should see these controls:
  1. Search box
  2. Member status dropdown
  3. License status dropdown
  4. "Nuevo Miembro" button ← (Club filter should NOT be here)
- ✓ NO "Filtrar por club" dropdown visible

**Pass/Fail**: _______

---

### Test 2.3: Only Own Club Members Visible

**Steps**:
1. Look at the members in the table
2. Check if they all belong to the same club
3. (If you know which club this admin belongs to, verify members match)

**Expected Result**:
- ✓ All visible members belong to the club admin's club
- ✓ No members from other clubs are shown
- ✓ This is enforced by backend, not just hidden in UI

**Pass/Fail**: _______

---

### Test 2.4: Mobile View - NO Club Names

**Steps**:
1. Resize to mobile width
2. Look at member cards
3. Check the line after the member name

**Expected Result**:
- ✓ Member cards should show: "Grado: [Grade]"
- ✓ NO club name before the grade
- ✓ NO separator pipe (|) before grade

**Pass/Fail**: _______

---

### Test 2.5: Can Still Perform Other Actions

**Steps**:
1. Try searching for a member
2. Try filtering by license status
3. Try clicking on a member to view/edit

**Expected Result**:
- ✓ All other features work normally
- ✓ Only club-related features are hidden
- ✓ CRUD operations work for own club members

**Pass/Fail**: _______

---

## Test Session 3: Cross-Browser Testing

Repeat Test Session 1 (Tests 1.1-1.7 at minimum) in each browser:

### Chrome
- Version: _______
- Tests Passed: ___ / ___
- Issues Found: _______

### Firefox
- Version: _______
- Tests Passed: ___ / ___
- Issues Found: _______

### Safari (if available)
- Version: _______
- Tests Passed: ___ / ___
- Issues Found: _______

### Edge
- Version: _______
- Tests Passed: ___ / ___
- Issues Found: _______

---

## Issue Reporting Template

If you find any issues, document them using this template:

```
Issue #: ___
Test ID: ___
Severity: Critical / High / Medium / Low
Browser: ___
Account Type: Super Admin / Club Admin

Description:
[What went wrong]

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots/Videos:
[Link or attach]

Additional Notes:
[Any other relevant information]
```

---

## Final Checklist

- [ ] All Super Admin tests passed (14 tests)
- [ ] All Club Admin tests passed (5 tests)
- [ ] Cross-browser testing completed (4 browsers)
- [ ] All issues documented
- [ ] No critical or high severity issues remaining
- [ ] Screenshots/videos captured for documentation
- [ ] Results documented in feedback report

---

## Completion

**Tested By**: _______________________
**Date**: _______________________
**Overall Result**: Pass / Fail / Pass with Minor Issues

**Signature**: _______________________

---

## Notes
