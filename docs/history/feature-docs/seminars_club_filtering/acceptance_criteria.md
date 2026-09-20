# Acceptance Criteria: Seminars Club-Based Filtering

## Feature Overview
Implement role-based filtering for seminars where club admins can only access seminars from their own club, while super admins retain full access to all seminars across all clubs.

## User Stories

### US-1: Club Admin Seminar List Access
**As a** club admin
**I want to** see only seminars from my own club
**So that** I can manage my club's events without being confused by other clubs' seminars

### US-2: Club Admin Seminar Creation
**As a** club admin
**I want to** create seminars that are automatically associated with my club
**So that** I don't have to manually select my club every time

### US-3: Club Admin Seminar Ownership
**As a** club admin
**I want to** edit and delete only seminars from my club
**So that** I cannot accidentally modify other clubs' events

### US-4: Super Admin Full Access
**As a** super admin
**I want to** view, create, edit, and delete all seminars across all clubs
**So that** I can manage the entire platform

---

## Acceptance Criteria

### AC-1: Club Admin - Seminar List View

**Given** I am logged in as a club admin (director@aikido-madrid.es)
**When** I navigate to the Seminarios page
**Then** I should only see seminars where club_id matches my club
**And** I should not see any seminars from other clubs
**And** If my club has no seminars, I should see an empty list

**Edge Cases:**
- Given I am a club admin without an assigned club_id
  When I navigate to Seminarios
  Then I should see an empty list

**Technical Validation:**
- Backend: GET /seminars with club admin JWT should return filtered results
- Backend: club_id query parameter should be ignored for club admins
- Frontend: useSeminarContext should automatically inject club_id filter

---

### AC-2: Club Admin - Seminar Creation

**Given** I am logged in as a club admin
**When** I create a new seminar
**Then** the seminar should be automatically assigned to my club
**And** I should not see a club selector in the form
**And** the created seminar should appear in my seminar list

**Edge Cases:**
- Given I am a club admin without an assigned club_id
  When I attempt to create a seminar
  Then the seminar should be created without a club_id (or backend should reject)

**Technical Validation:**
- Backend: POST /seminars should override club_id from DTO with ctx.club_id
- Frontend: SeminarForm should inject clubId before submission
- Frontend: No club_id input field should be visible for club admins

---

### AC-3: Club Admin - Edit Own Seminar

**Given** I am logged in as a club admin
**And** I own a seminar (seminar.club_id matches my club)
**When** I edit the seminar
**Then** the update should succeed
**And** I should not be able to change the club_id
**And** the seminar should remain assigned to my club

**Technical Validation:**
- Backend: PUT /seminars/{id} should verify ownership via check_club_access_ctx
- Backend: club_id should be stripped from update payload for club admins
- Frontend: Edit form should work normally for owned seminars

---

### AC-4: Club Admin - Cannot Edit Other Club's Seminar

**Given** I am logged in as a club admin
**And** a seminar exists that belongs to another club
**When** I attempt to edit that seminar (via API or URL manipulation)
**Then** I should receive a 403 Forbidden error
**And** the seminar should remain unchanged

**Technical Validation:**
- Backend: PUT /seminars/{id} should return 403 if seminar.club_id != ctx.club_id
- Backend: check_club_access_ctx should raise ClubAccessDeniedError

---

### AC-5: Club Admin - Delete Own Seminar

**Given** I am logged in as a club admin
**And** I own a seminar
**When** I delete the seminar
**Then** the deletion should succeed
**And** the seminar should be removed from my list

**Technical Validation:**
- Backend: DELETE /seminars/{id} should verify ownership
- Frontend: Delete action should work normally for owned seminars

---

### AC-6: Club Admin - Cannot Delete Other Club's Seminar

**Given** I am logged in as a club admin
**And** a seminar exists that belongs to another club
**When** I attempt to delete that seminar (via API or URL manipulation)
**Then** I should receive a 403 Forbidden error
**And** the seminar should remain in the system

**Technical Validation:**
- Backend: DELETE /seminars/{id} should return 403 if unauthorized
- Backend: check_club_access_ctx should validate ownership

---

### AC-7: Club Admin - Cancel Own Seminar

**Given** I am logged in as a club admin
**And** I own a seminar
**When** I cancel the seminar
**Then** the cancellation should succeed
**And** the seminar status should be updated

**Technical Validation:**
- Backend: PUT /seminars/{id}/cancel should verify ownership
- Frontend: Cancel action should work for owned seminars

---

### AC-8: Club Admin - Cannot Cancel Other Club's Seminar

**Given** I am logged in as a club admin
**And** a seminar exists that belongs to another club
**When** I attempt to cancel that seminar
**Then** I should receive a 403 Forbidden error
**And** the seminar status should remain unchanged

**Technical Validation:**
- Backend: PUT /seminars/{id}/cancel should return 403 if unauthorized

---

### AC-9: Super Admin - View All Seminars

**Given** I am logged in as a super admin (admin@spainaikikai.es)
**When** I navigate to the Seminarios page
**Then** I should see seminars from all clubs
**And** I should be able to filter by club_id if desired
**And** I should be able to filter by association_id if desired

**Technical Validation:**
- Backend: GET /seminars should not apply forced filtering for super admins
- Backend: club_id and association_id query params should be respected
- Frontend: No automatic club_id filter should be applied

---

### AC-10: Super Admin - Create Seminar for Any Club

**Given** I am logged in as a super admin
**When** I create a new seminar
**Then** I should be able to assign it to any club (or no club)
**And** the seminar should be created as specified
**And** the seminar should appear in the seminar list

**Technical Validation:**
- Backend: POST /seminars should use club_id from DTO, not ctx.club_id
- Frontend: SeminarForm should allow club_id in request body (optional)

---

### AC-11: Super Admin - Edit Any Seminar

**Given** I am logged in as a super admin
**And** a seminar exists (from any club)
**When** I edit the seminar
**Then** the update should succeed
**And** I should be able to modify all fields including club_id

**Technical Validation:**
- Backend: PUT /seminars/{id} should not apply ownership checks
- Backend: club_id in update payload should be respected

---

### AC-12: Super Admin - Delete Any Seminar

**Given** I am logged in as a super admin
**And** a seminar exists (from any club)
**When** I delete the seminar
**Then** the deletion should succeed
**And** the seminar should be removed from the system

**Technical Validation:**
- Backend: DELETE /seminars/{id} should not apply ownership checks

---

### AC-13: Unauthenticated Access Prevention

**Given** I am not logged in
**When** I attempt to access GET /seminars
**Then** I should receive a 401 Unauthorized error

**Given** I am not logged in
**When** I attempt to access any seminar endpoint (POST, PUT, DELETE)
**Then** I should receive a 401 Unauthorized error

**Technical Validation:**
- Backend: All endpoints should require get_auth_context dependency
- Backend: 401 should be returned before any business logic

---

## Non-Functional Requirements

### NFR-1: Performance
- **Criterion**: GET /seminars should return results within 500ms for lists up to 100 seminars
- **Validation**: Load test with 100 seminars, measure response time

### NFR-2: Security
- **Criterion**: All club-based filtering must be enforced at the backend level
- **Validation**: Frontend filtering alone is insufficient; API must enforce permissions
- **Criterion**: JWT tokens must contain accurate club_id and global_role claims
- **Validation**: Token payload inspection

### NFR-3: Data Integrity
- **Criterion**: Club admins cannot modify club_id field on existing seminars
- **Validation**: Attempt to change club_id via API, verify it's ignored/rejected
- **Criterion**: Orphaned seminars (no club_id) should be visible only to super admins
- **Validation**: Create seminar without club_id, verify club admins don't see it

### NFR-4: Accessibility
- **Criterion**: Seminar list should be keyboard navigable
- **Criterion**: Form validation errors should be announced to screen readers
- **Validation**: Test with screen reader (NVDA/JAWS)

### NFR-5: Browser Compatibility
- **Criterion**: Feature should work in Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
- **Validation**: Playwright tests across browsers

---

## Test Data Requirements

### Setup: Create Test Clubs
```json
Club 1: {
  "id": "club1_id",
  "name": "Aikido Madrid",
  "email": "director@aikido-madrid.es"
}

Club 2: {
  "id": "club2_id",
  "name": "Aikido Barcelona",
  "email": "director@aikido-barcelona.es"
}
```

### Setup: Create Test Users
```json
Super Admin: {
  "email": "admin@spainaikikai.es",
  "password": "admin123",
  "global_role": "super_admin"
}

Club Admin 1: {
  "email": "director@aikido-madrid.es",
  "password": "demo123",
  "global_role": "user",
  "club_id": "club1_id",
  "club_role": "admin"
}

Club Admin 2: {
  "email": "director@aikido-barcelona.es",
  "password": "demo123",
  "global_role": "user",
  "club_id": "club2_id",
  "club_role": "admin"
}
```

### Setup: Create Test Seminars
```json
Seminar 1 (Madrid): {
  "title": "Seminar Aikido Avanzado Madrid",
  "club_id": "club1_id",
  "instructor_name": "Sensei Juan",
  "venue": "Dojo Madrid",
  "start_date": "2026-03-15T10:00:00Z",
  "end_date": "2026-03-15T18:00:00Z"
}

Seminar 2 (Barcelona): {
  "title": "Seminar Aikido Básico Barcelona",
  "club_id": "club2_id",
  "instructor_name": "Sensei Pedro",
  "venue": "Dojo Barcelona",
  "start_date": "2026-03-20T10:00:00Z",
  "end_date": "2026-03-20T18:00:00Z"
}

Seminar 3 (No Club): {
  "title": "Seminar Nacional",
  "club_id": null,
  "instructor_name": "Sensei Global",
  "venue": "Venue Nacional",
  "start_date": "2026-04-01T10:00:00Z",
  "end_date": "2026-04-01T18:00:00Z"
}
```

---

## Validation Test Plan

### Test Suite 1: Club Admin Happy Path
1. Login as director@aikido-madrid.es
2. Navigate to Seminarios page
3. Verify only Madrid seminars are visible
4. Create a new seminar (verify club_id auto-assigned)
5. Edit own seminar (verify success)
6. Delete own seminar (verify success)

### Test Suite 2: Club Admin Security Boundary
1. Login as director@aikido-madrid.es
2. Attempt to access Barcelona seminar via API (GET /seminars/{barcelona_id})
3. Attempt to edit Barcelona seminar via API (PUT /seminars/{barcelona_id})
4. Attempt to delete Barcelona seminar via API (DELETE /seminars/{barcelona_id})
5. Verify all attempts return 403 or are filtered out

### Test Suite 3: Super Admin Full Access
1. Login as admin@spainaikikai.es
2. Navigate to Seminarios page
3. Verify all seminars from all clubs are visible
4. Create seminar for Club 1 (verify success)
5. Edit seminar from Club 2 (verify success)
6. Delete any seminar (verify success)

### Test Suite 4: Authentication Required
1. Logout (clear tokens)
2. Attempt to access GET /seminars without authentication
3. Verify 401 Unauthorized response

### Test Suite 5: Edge Cases
1. Login as club admin without club_id assignment
2. Verify empty seminar list
3. Attempt to create seminar (verify behavior)
4. Login as super admin
5. Create seminar without club_id
6. Verify only super admin can see it

---

## Acceptance Criteria Summary

| ID | Criterion | Priority | Status |
|---|---|---|---|
| AC-1 | Club admin sees only own club's seminars | P0 | To Validate |
| AC-2 | Club admin creates seminar with auto club_id | P0 | To Validate |
| AC-3 | Club admin can edit own seminar | P0 | To Validate |
| AC-4 | Club admin cannot edit other club's seminar | P0 | To Validate |
| AC-5 | Club admin can delete own seminar | P0 | To Validate |
| AC-6 | Club admin cannot delete other club's seminar | P0 | To Validate |
| AC-7 | Club admin can cancel own seminar | P1 | To Validate |
| AC-8 | Club admin cannot cancel other club's seminar | P1 | To Validate |
| AC-9 | Super admin sees all seminars | P0 | To Validate |
| AC-10 | Super admin creates seminar for any club | P0 | To Validate |
| AC-11 | Super admin can edit any seminar | P0 | To Validate |
| AC-12 | Super admin can delete any seminar | P0 | To Validate |
| AC-13 | Unauthenticated users are blocked | P0 | To Validate |
| NFR-1 | Performance < 500ms | P1 | To Validate |
| NFR-2 | Backend enforces security | P0 | To Validate |
| NFR-3 | Data integrity maintained | P0 | To Validate |
| NFR-4 | Accessibility compliance | P2 | To Validate |
| NFR-5 | Browser compatibility | P1 | To Validate |

---

## Definition of Done

- [ ] All P0 acceptance criteria pass validation
- [ ] All P1 acceptance criteria pass validation
- [ ] Backend security enforces club-based filtering
- [ ] Frontend provides appropriate UX for both roles
- [ ] No regression in existing seminar functionality
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Session context file updated with validation results
