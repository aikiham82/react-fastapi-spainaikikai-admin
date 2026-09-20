# Acceptance Criteria: Licencias y Seguros en la Ficha de Miembros

## Feature Overview
**User Story**: As a club administrator or association administrator, I want to see member license and insurance information directly in the member list table, so that I can quickly assess member compliance status without navigating to separate pages.

**Business Value**: Reduces clicks and page loads for common administrative tasks, improves operational efficiency, and provides at-a-glance compliance visibility.

---

## Acceptance Criteria

### AC1: Backend API Enrichment
**Given** the system has members with associated licenses and insurances
**When** I request the member list via `GET /api/v1/members`
**Then** each member response includes:
- `license_summary` object with fields: `grade`, `technical_grade`, `instructor_category`, `status`, `expiration_date`
- `insurance_summary` object with fields: `has_accident`, `accident_status`, `has_rc`, `rc_status`

**Performance Requirement**: The enrichment uses batch queries (2 total queries via `find_by_member_ids`), NOT N+1 queries per member.

---

### AC2: Desktop Table Columns Display
**Given** I am viewing the member list on a desktop browser (viewport width >= 768px)
**When** the member list loads
**Then** the table displays the following columns in order:
1. Nombre (Name with phone number)
2. Email
3. Club
4. Grado (Grade badge)
5. Seguro RC (Civil Liability insurance badge)
6. Seguro Acc. (Accident insurance badge)
7. Pagos (Payments icon button)
8. Acciones (Actions: View, Edit, Delete)

**Visual Verification**: Each column has appropriate alignment and spacing.

---

### AC3: Grade Badge Rendering
**Given** a member with license data
**When** the member row is rendered
**Then** the Grado column displays:
- Grade badge with the member's grade (e.g., "1º Dan", "3º Kyu")
- Instructor category badge if applicable (Shidoin, Fukushidoin)

**Edge Case - No License**:
**Given** a member has no license
**When** the member row is rendered
**Then** the Grado column displays a gray "Sin grado" badge

**Badge Variants**:
| Grade Status | Badge Variant | Expected Color |
|--------------|---------------|----------------|
| Has grade | default | Primary blue |
| No grade | secondary | Gray |
| Shidoin | default | Primary blue |
| Fukushidoin | outline | Outlined |

---

### AC4: License Status Badge Rendering
**Given** a member with a license
**When** viewing the member in mobile cards view
**Then** the license status badge displays with:

| Status | Badge Variant | Label | Color |
|--------|---------------|-------|-------|
| active | success | "Activa" | Green |
| expired | destructive | "Expirada" | Red |
| pending | warning | "Pendiente" | Yellow |
| revoked | destructive | "Revocada" | Red |
| null/undefined | secondary | "Sin licencia" | Gray |

---

### AC5: Insurance Status Badge Rendering
**Given** a member with insurance data
**When** the member row or card is rendered
**Then** insurance badges display for both RC and Accident types:

**Civil Liability (RC)**:
| Has RC | Status | Badge Variant | Label | Icon |
|--------|--------|---------------|-------|------|
| false | - | secondary | "Sin seguro" | Shield |
| true | active | success | "Activo" | ShieldCheck |
| true | expired | destructive | "Expirado" | ShieldX |
| true | pending | warning | "Pendiente" | ShieldX |
| true | cancelled | destructive | "Cancelado" | ShieldX |

**Accident Insurance (Acc.)**:
Same mapping as RC, applied independently.

---

### AC6: Mobile Cards Layout
**Given** I am viewing the member list on a mobile device (viewport width < 768px)
**When** the member list loads
**Then** each member displays as a card containing:
- Header: Member name + License status badge (top-right)
- Line 2: Phone number, Email
- Line 3: Club name | Grade badge (compact, no instructor badge)
- Line 4: "Seguros:" label + RC badge + Accident badge
- Footer: Action buttons (Payments, View, Edit, Delete)

**Compact Mode**: Grade badge in mobile cards does NOT show instructor category badge to save space.

---

### AC7: Quick-View Dialog Content
**Given** I click the "Eye" icon to view member details
**When** the quick-view dialog opens
**Then** the dialog displays:

**Contact Section**:
- Email, Phone
- Address (full address with postal code and city)
- Birth date (formatted as DD/MM/YYYY)

**Separator** (visual divider)

**Licencia Section**:
- Label: "Licencia"
- Grade badge + License status badge (inline, with spacing)
- Expiration date text (if available): "Vence: DD/MM/YYYY"

**Separator** (visual divider)

**Seguros Section**:
- Label: "Seguros"
- Two sub-sections:
  - "Responsabilidad Civil" label + RC insurance badge
  - "Accidentes" label + Accident insurance badge

---

### AC8: Edge Cases Handling

#### 8.1 Member with No License Data
**Given** a member has no associated licenses
**When** the member is displayed
**Then**:
- Desktop table shows "Sin grado" gray badge in Grado column
- Mobile card shows "Sin licencia" gray badge at top-right
- Quick-view dialog shows "Sin grado" and "Sin licencia" badges

#### 8.2 Member with No Insurance Data
**Given** a member has no associated insurances
**When** the member is displayed
**Then**:
- Desktop table shows "Sin seguro" gray badges with Shield icon in both insurance columns
- Mobile card shows "Sin seguro" gray badges with Shield icon
- Quick-view dialog shows "Sin seguro" gray badges for both RC and Accident

#### 8.3 Member with Expired License
**Given** a member has a license with status "expired"
**When** the member is displayed
**Then**:
- Grade badge still shows the grade (not affected by expiration)
- License status badge shows "Expirada" in red (destructive variant)

#### 8.4 Member with Mixed Insurance Status
**Given** a member has active RC but expired Accident insurance
**When** the member is displayed
**Then**:
- RC badge shows "Activo" in green
- Accident badge shows "Expirado" in red
- Both badges display independently

---

### AC9: Performance Requirements

#### 9.1 No N+1 Query Problem
**Given** the member list has 50 members
**When** the list endpoint is called
**Then**:
- Backend executes exactly 3 queries total:
  1. Member list query
  2. Batch license query (`find_by_member_ids`)
  3. Batch insurance query (`find_by_member_ids`)

**Verification Method**: Backend logs or database query profiling.

#### 9.2 Primary License Selection Logic
**Given** a member has multiple licenses
**When** the backend builds the license summary
**Then**:
- If there are active licenses, select the one with the latest expiration date
- If no active licenses, select the most recent license by creation date
- Use this license for all summary fields

---

### AC10: Accessibility Requirements

**Keyboard Navigation**:
- All action buttons must be keyboard accessible
- Tab order follows logical reading order
- Focus indicators are visible on all interactive elements

**Screen Reader Support**:
- Action buttons have `aria-label` attributes:
  - "Ver detalles del miembro"
  - "Editar miembro"
  - "Eliminar miembro"
  - "Ver pagos"
- Badges have meaningful text content

**Visual Clarity**:
- Badge colors provide sufficient contrast (WCAG AA minimum)
- Icons supplement color coding (not color-only information)

---

## Non-Functional Requirements

### Security
- Club admins can only see members from their assigned club
- Association admins can see all members
- Authorization checks apply before enrichment queries

### Maintainability
- Badge rendering logic extracted to reusable components (`MemberBadges.tsx`)
- Badge utility functions in separate file (`member-badges.ts`)
- Clear separation between summary DTOs and full entity models

### Data Consistency
- Backend uses `Optional` types for all summary fields
- Frontend handles `null`/`undefined` gracefully with fallback displays
- No assumptions about data presence

---

## Test Data Requirements

For comprehensive validation, test data should include:
1. Member with active license + active insurances
2. Member with expired license + active insurances
3. Member with pending license + no insurances
4. Member with no license + no insurances
5. Member with multiple licenses (to test primary selection)
6. Member with Shidoin instructor category
7. Member with Fukushidoin instructor category
8. Member with active RC but expired Accident insurance

---

## Out of Scope

The following are explicitly NOT part of this feature:
- Editing license/insurance data from the member list
- Filtering members by insurance status
- Showing full license/insurance history
- Clicking badges to navigate to license/insurance detail pages
- Bulk operations on licenses/insurances

---

## Dependencies

- Backend: `LicenseRepository.find_by_member_ids` implementation
- Backend: `InsuranceRepository.find_by_member_ids` implementation
- Frontend: UI Badge component supports `success` and `warning` variants
- Frontend: Separator component from Radix UI
- Frontend: Lucide React icons (Shield, ShieldCheck, ShieldX)

---

## Rollback Plan

If critical issues are found:
1. Backend can remove enrichment calls (members still load without summaries)
2. Frontend can hide new columns with CSS while keeping existing functionality
3. No database migrations required (feature is purely display-level)
