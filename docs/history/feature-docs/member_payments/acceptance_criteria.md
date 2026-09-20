# Acceptance Criteria: Member Payment Tracking in Pagos Anuales

**Feature**: Individual member payment tracking within the Annual Payments (Pagos Anuales) system

**User Story**:
As an Aikido club administrator, I want to track which specific members have paid their annual fees (licenses and insurances), so that I can monitor individual payment compliance and avoid duplicate payments.

---

## 1. Backend API Endpoints

### 1.1 Get Member Payment Status
**Given** a valid member ID exists in the system
**When** I make a GET request to `/api/v1/member-payments/member/{member_id}`
**Then** the response should:
- Return HTTP 200 status code
- Include member_id, member_name, and current_year
- Include a payment_types array with all 7 payment types (licencia_kyu, licencia_kyu_infantil, licencia_dan, titulo_fukushidoin, titulo_shidoin, seguro_accidentes, seguro_rc)
- Each payment type should have: type, concept, status (paid/pending), amount, and payment_date
- Include total_paid amount
- Require authentication

**Given** an invalid member ID
**When** I make a GET request to `/api/v1/member-payments/member/{invalid_id}`
**Then** the response should return HTTP 404 status code

### 1.2 Get Member Payment History
**Given** a valid member ID with historical payments
**When** I make a GET request to `/api/v1/member-payments/member/{member_id}/history`
**Then** the response should:
- Return HTTP 200 status code
- Include member_id and member_name
- Include a payments array with all historical MemberPayment records
- Each payment should include: id, payment_type, concept, amount, status, payment_year, created_at
- Payments should be sorted by payment_year descending, then created_at descending
- Require authentication

### 1.3 Get Club Payment Summary
**Given** a valid club ID with member payments
**When** I make a GET request to `/api/v1/member-payments/club/{club_id}/summary?year=2024`
**Then** the response should:
- Return HTTP 200 status code
- Include club_id, club_name, and year
- Include payment_summary with per-type breakdown: total_members, total_paid, total_pending, total_amount
- Include members_summary array with per-member data: member_id, member_name, paid_count, pending_count, total_paid
- Calculate totals correctly across all payment types
- Default to current year if year parameter not provided
- Require authentication

### 1.4 Get Unpaid Members List
**Given** a valid club ID with members who have pending payments
**When** I make a GET request to `/api/v1/member-payments/club/{club_id}/unpaid?year=2024`
**Then** the response should:
- Return HTTP 200 status code
- Include unpaid_members array with: member_id, member_name, unpaid_items array
- Each unpaid_item should have: payment_type, concept, expected_amount
- Only include members with at least one pending payment
- Default to current year if year parameter not provided
- Require authentication

---

## 2. Annual Payment Form - Member Selection

### 2.1 Member Selection Section Visibility
**Given** I am on the Annual Payment Form page
**When** I have selected a club from the dropdown
**And** I have entered quantities for at least one payment type (licenses or insurances)
**Then** the "Seleccionar Miembros" section should appear below the payment summary

**Given** I am on the Annual Payment Form page
**When** I have not selected a club OR have not entered any quantities
**Then** the "Seleccionar Miembros" section should not be visible

### 2.2 Member Selection Modal Opening
**Given** the "Seleccionar Miembros" section is visible
**When** I click the "Seleccionar Miembros" button
**Then** a modal dialog should open displaying:
- The club name in the header
- A table with columns: Nombre, DNI/NIE, and one column per payment type with quantity > 0
- All active members from the selected club as rows
- Checkboxes in each payment type column
- "Cancelar" and "Guardar Selección" buttons at the bottom

### 2.3 Member Assignment via Checkboxes
**Given** the member selection modal is open
**And** I have specified quantity 3 for "Licencia Kyu"
**When** I check the "Licencia Kyu" checkbox for 3 different members
**Then** the checkboxes should remain enabled for those 3 members
**And** the "Licencia Kyu" checkbox should be disabled for all other members
**And** a counter should show "3/3 seleccionados"

**Given** I have already assigned the maximum quantity for a payment type
**When** I uncheck one member's checkbox for that type
**Then** the checkboxes for other members should become enabled again
**And** the counter should update to reflect the new count (e.g., "2/3 seleccionados")

### 2.4 Member Assignment Validation
**Given** I have entered quantity 2 for "Seguro Accidentes"
**When** I attempt to check the checkbox for a 3rd member
**Then** the checkbox should be disabled and not allow selection
**And** a visual indicator should show "2/2 seleccionados"

### 2.5 Member Assignment Persistence
**Given** I have selected members in the modal
**When** I click "Guardar Selección"
**Then** the modal should close
**And** the "Seleccionar Miembros" section should display a summary showing:
  - Total number of members assigned
  - Breakdown by payment type (e.g., "Licencia Kyu: 3 miembros")
**And** the member assignments should be included in the payment initiation request

### 2.6 Member Assignment Modification
**Given** I have previously saved member selections
**When** I click "Seleccionar Miembros" again
**Then** the modal should open with my previous selections pre-checked
**And** I should be able to modify the selections
**And** clicking "Guardar Selección" should update the assignments

---

## 3. Member List - Payment Status Column

### 3.1 Payment Status Column Display
**Given** I am on the Members List page
**When** the page loads
**Then** I should see a "Pagos" column in the member table
**And** each row should have a button or icon to view payment status

### 3.2 Payment Status Dialog Opening
**Given** I am viewing the member list
**When** I click the "Ver Pagos" button for a specific member
**Then** a dialog should open displaying the MemberPaymentStatus component
**And** the dialog should show the member's name in the header
**And** the dialog should fetch payment data for the current year

### 3.3 Payment Status Dialog Content
**Given** the payment status dialog is open for a member
**Then** I should see:
- Member name and year clearly displayed
- All 7 payment types organized by category (Licenses and Insurances)
- For each payment type: concept name, status badge (paid/pending), amount, and payment date (if paid)
- Total amount paid at the bottom
- A close button

### 3.4 Payment Status Visual Indicators
**Given** the payment status is displayed
**When** a payment type is marked as "paid"
**Then** it should show a green checkmark icon or badge with "Pagado"
**And** display the amount and payment date

**Given** the payment status is displayed
**When** a payment type is marked as "pending"
**Then** it should show a red X icon or badge with "Pendiente"
**And** display the expected amount without a payment date

---

## 4. Payment Flow Integration

### 4.1 Member Payment Record Creation on Success
**Given** an annual payment is initiated with member assignments
**And** the payment is successfully processed via Redsys webhook
**When** the webhook confirms the payment
**Then** MemberPayment records should be created for all assigned members
**And** each record should have status="completed"
**And** the payment_id should link to the parent Payment record

### 4.2 Member Payment Status Reflects Completed Payment
**Given** a member was assigned to a payment that completed successfully
**When** I view that member's payment status
**Then** the assigned payment types should show status="paid"
**And** the payment date should match the completion timestamp

### 4.3 Backward Compatibility - Payments Without Member Assignments
**Given** I initiate an annual payment
**When** I do not assign any members
**Then** the payment should still process successfully
**And** no MemberPayment records should be created
**And** the total amount should still be calculated correctly

---

## Edge Cases

### EC1: Member Deleted After Assignment
**Scenario**: A member is assigned to a payment but is deleted before payment completion
**Expected Behavior**: The payment should still process, but MemberPayment creation should skip deleted members and log a warning

### EC2: Duplicate Payment Prevention
**Scenario**: A member already has a paid record for "Licencia Kyu" for year 2024, and an admin tries to assign them again
**Expected Behavior**: The system should show a warning or prevent selection of members who already have paid status for that type and year

### EC3: Partial Member Assignment
**Scenario**: Quantity is 5 for "Seguro RC" but only 3 members are assigned
**Expected Behavior**: The payment should process for the full quantity, but only 3 MemberPayment records are created

### EC4: Club Change After Member Selection
**Scenario**: Members are selected for Club A, then the club dropdown is changed to Club B
**Expected Behavior**: The member selections should be cleared, and the user should be prompted to select members from Club B

### EC5: Zero Quantity Payment Types
**Scenario**: No quantity is entered for "Titulo Shidoin"
**Expected Behavior**: That payment type should not appear in the member selection modal columns

---

## Non-Functional Requirements

### Performance
- Member selection modal should load member data within 2 seconds for clubs with up to 500 members
- Payment status API responses should return within 500ms for typical datasets
- Club summary endpoint should handle 1000+ member payments and return within 2 seconds

### Accessibility
- All modal dialogs should be keyboard-navigable (Tab, Enter, Escape)
- Screen readers should announce payment status changes
- Color indicators should not be the only way to distinguish paid/pending status (use icons + text)
- Focus should trap within modals when open
- Focus should return to trigger button when modal closes

### Security
- All endpoints require valid JWT authentication
- Users can only view member payment data for clubs they have access to
- Member payment records should include audit trail (created_at, updated_at)
- Sensitive member data should not be exposed in error messages

### Data Integrity
- Member assignment counts must never exceed specified quantities
- Payment status must accurately reflect Redsys webhook results
- MemberPayment creation should be atomic (all or none) within a payment
- Concurrent requests should not create duplicate MemberPayment records

### Usability
- Clear error messages if API calls fail (network issues, validation errors)
- Loading states should be shown during async operations
- Member selection table should be searchable/filterable for large clubs
- Payment type labels should use Spanish terminology consistent with the domain

---

## Test Data Requirements

For comprehensive validation, the following test data is needed:
- At least 2 clubs with different members
- Members with various payment statuses (all paid, partially paid, none paid)
- At least one payment with member assignments that completed successfully
- At least one payment without member assignments (backward compatibility)
- Historical payment records spanning multiple years
- Edge cases: members with same names, members without DNI/NIE

---

## Acceptance Testing Checklist

- [ ] Backend endpoints return correct data structure and status codes
- [ ] Member selection modal displays correctly with club member data
- [ ] Checkbox logic enforces quantity limits properly
- [ ] Member assignments are persisted and sent with payment request
- [ ] Payment status dialog shows accurate paid/pending status
- [ ] Visual indicators (badges, icons) correctly represent status
- [ ] Redsys webhook creates MemberPayment records on success
- [ ] Member payment history displays all records chronologically
- [ ] Club payment summary calculates totals correctly
- [ ] Unpaid members list filters correctly
- [ ] All features work with authentication enabled
- [ ] Edge cases are handled gracefully
- [ ] Non-functional requirements are met (performance, accessibility, security)
