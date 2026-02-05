# QA Automated Testing Plan - Aikido Admin

## Overview

**Application URL:** http://localhost:5173
**Browser MCP:** chrome-devtools
**Test Data Strategy:** Full CRUD testing with TEST_ prefix
**Services Status:** Backend (FastAPI) and Frontend (React) running

---

## Phase 1: Setup & Authentication

### 1.1 Browser Connection
- Load chrome-devtools MCP tools
- List available pages with `mcp__chrome-devtools__list_pages`
- Navigate to http://localhost:5173

### 1.2 Authentication
- Navigate to login page
- Authenticate with test admin credentials
- Verify successful login (redirect to dashboard)
- Capture authentication token for API verification

---

## Phase 2: Module Testing (Dependency Order)

Testing will follow the data dependency chain:
```
Dashboard → Clubs → Members → Licenses → Payments → Invoices → Seminars → Insurance → Import/Export → Prices → Settings
```

### 2.1 Dashboard (/home)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-DASH-001 | Dashboard loads | Navigate, verify stats cards visible |
| TC-DASH-002 | Statistics display | Verify total_clubs, total_members, active_members |
| TC-DASH-003 | Expiring licenses section | Verify list renders |
| TC-DASH-004 | Upcoming seminars section | Verify list renders |
| TC-DASH-005 | Recent activity | Verify activity feed |
| TC-DASH-006 | Navigation links work | Click each sidebar item |

### 2.2 Clubs (/clubs)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-CLUB-001 | List clubs | Navigate, verify list renders |
| TC-CLUB-002 | Search clubs | Type in search, verify filtering |
| TC-CLUB-003 | Create club | Click "+ Nuevo Club", fill form, submit |
| TC-CLUB-004 | Validation - required fields | Submit empty form, verify errors |
| TC-CLUB-005 | Edit club | Click edit, modify, save |
| TC-CLUB-006 | View club details | Click view, verify dialog |
| TC-CLUB-007 | Delete club | Click delete, confirm, verify removal |

**Test Data:**
```json
{
  "name": "TEST_Dojo Aikido Madrid",
  "address": "Calle Test 123",
  "city": "Madrid",
  "province": "Madrid",
  "postal_code": "28001",
  "phone": "+34 600 000 001",
  "email": "test.club@aikido.test"
}
```

### 2.3 Members (/members)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-MEMB-001 | List members | Navigate, verify list renders |
| TC-MEMB-002 | Search members | Type in search, verify filtering |
| TC-MEMB-003 | Filter by status | Use status filter dropdown |
| TC-MEMB-004 | Pagination | Navigate between pages |
| TC-MEMB-005 | Create member | Click "+ Nuevo Miembro", fill form |
| TC-MEMB-006 | Validation - DNI format | Enter invalid DNI, verify error |
| TC-MEMB-007 | Validation - email format | Enter invalid email, verify error |
| TC-MEMB-008 | Edit member | Click edit, modify, save |
| TC-MEMB-009 | Delete member | Click delete, confirm |

**Test Data:**
```json
{
  "first_name": "TEST_Juan",
  "last_name": "Garcia Prueba",
  "dni": "12345678Z",
  "email": "test.member@aikido.test",
  "phone": "+34 600 000 002",
  "birth_date": "1990-01-15",
  "club_id": "<from created club>"
}
```

### 2.4 Licenses (/licenses)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-LIC-001 | List licenses | Navigate, verify list renders |
| TC-LIC-002 | Create license | Click "+ Nueva Licencia", fill form |
| TC-LIC-003 | License number auto-generation | Verify SA-YYYY format |
| TC-LIC-004 | Edit license | Modify grade, dates |
| TC-LIC-005 | Renew license | Click renew, set new date |
| TC-LIC-006 | Download license image | Click image download |
| TC-LIC-007 | Filter by club | Use club filter |
| TC-LIC-008 | Delete license | Click delete, confirm |

### 2.5 Payments (/payments)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-PAY-001 | List payments | Navigate, verify list |
| TC-PAY-002 | Filter by year | Use year filter |
| TC-PAY-003 | Filter by status | Use status filter |
| TC-PAY-004 | View payment details | Click on payment row |
| TC-PAY-005 | Payment status display | Verify status badges |

### 2.6 Invoices (/invoices)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-INV-001 | List invoices | Navigate, verify list |
| TC-INV-002 | Download PDF | Click PDF button |
| TC-INV-003 | Filter by date | Use date range filter |
| TC-INV-004 | Invoice details | View line items, totals |

### 2.7 Seminars (/seminars)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-SEM-001 | List seminars | Navigate, verify list |
| TC-SEM-002 | Create seminar | Fill form with test data |
| TC-SEM-003 | Edit seminar | Modify details |
| TC-SEM-004 | Cancel seminar | Click cancel, confirm |
| TC-SEM-005 | View participants | Check participant count |
| TC-SEM-006 | Delete seminar | Click delete, confirm |

**Test Data:**
```json
{
  "title": "TEST_Seminario Nacional 2026",
  "description": "Seminario de prueba automatizada",
  "instructor_name": "Sensei Test",
  "venue": "Polideportivo Test",
  "start_date": "2026-06-15",
  "end_date": "2026-06-16",
  "price": 80.00,
  "max_participants": 50
}
```

### 2.8 Insurance (/insurance)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-INS-001 | List insurances | Navigate, verify list |
| TC-INS-002 | Create insurance | Fill form |
| TC-INS-003 | Edit insurance | Modify coverage, dates |
| TC-INS-004 | Expiring filter | Check expiration alerts |
| TC-INS-005 | Delete insurance | Click delete, confirm |

### 2.9 Import/Export (/import-export)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-IMP-001 | Export members | Click export, verify download |
| TC-IMP-002 | Export filtered | Apply club filter, export |

### 2.10 Price Configurations (/price-configurations)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-PRC-001 | List prices | Navigate, verify list |
| TC-PRC-002 | Create price config | Add new price entry |
| TC-PRC-003 | Edit price | Modify amount |
| TC-PRC-004 | Toggle active | Enable/disable config |
| TC-PRC-005 | Delete price | Remove configuration |

### 2.11 Settings (/settings)
**Test Cases:**
| ID | Test Case | Actions |
|----|-----------|---------|
| TC-SET-001 | View profile | Verify user info display |
| TC-SET-002 | Notification toggles | Toggle settings |
| TC-SET-003 | Appearance mode | Toggle dark mode |
| TC-SET-004 | Logout | Click logout, verify redirect |

---

## Phase 3: Cross-Cutting Tests

### 3.1 Error Monitoring
- Monitor console for JavaScript errors after each navigation
- Monitor network for 4xx/5xx responses
- Capture and log all errors

### 3.2 Navigation Tests
- Verify all sidebar links work
- Verify breadcrumb navigation
- Verify back button behavior
- Test unauthorized access attempts

### 3.3 UI Consistency
- Capture screenshots of each module
- Verify loading states display
- Verify empty states display
- Verify error messages display

---

## Phase 4: Cleanup

### 4.1 Delete Test Data (Reverse Order)
1. Delete TEST_ insurances
2. Delete TEST_ licenses
3. Delete TEST_ seminars
4. Delete TEST_ members
5. Delete TEST_ clubs

### 4.2 Final Report
- Compile all test results
- List all bugs found
- Generate coverage summary
- Take final screenshots

---

## Execution Strategy

### Using qa-criteria-validator Subagent
The `qa-criteria-validator` subagent will be used to:
1. Execute browser automation tests using chrome-devtools MCP
2. Validate acceptance criteria for each module
3. Generate test reports with pass/fail status
4. Capture evidence (screenshots, console logs)

### Test Data Prefix Convention
All test data will use the prefix `TEST_` for easy identification and cleanup:
- Club names: `TEST_Dojo...`
- Member names: `TEST_Juan...`
- Seminar titles: `TEST_Seminario...`

### Evidence Collection
For each test case:
1. Take snapshot before action
2. Execute test action
3. Take snapshot after action
4. Capture console messages
5. Log network errors

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Test Cases Executed | 100% |
| Critical Bugs | 0 |
| High Priority Bugs | < 3 |
| Console Errors | 0 JavaScript errors |
| Network Errors | 0 unexpected 4xx/5xx |
| Test Data Cleanup | 100% removed |

---

## Tools Required

### MCP Tools to Load:
```
mcp__chrome-devtools__list_pages
mcp__chrome-devtools__select_page
mcp__chrome-devtools__navigate_page
mcp__chrome-devtools__take_snapshot
mcp__chrome-devtools__take_screenshot
mcp__chrome-devtools__click
mcp__chrome-devtools__fill
mcp__chrome-devtools__fill_form
mcp__chrome-devtools__press_key
mcp__chrome-devtools__wait_for
mcp__chrome-devtools__list_console_messages
mcp__chrome-devtools__list_network_requests
```

---

## Notes

- Test user credentials needed before execution
- Chrome browser must be open with DevTools port enabled
- Backend must be running on expected port (default: 8000)
- Frontend must be running on http://localhost:5173
