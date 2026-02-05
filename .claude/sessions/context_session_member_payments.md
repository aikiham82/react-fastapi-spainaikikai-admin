# Context Session: Member Payments in Pagos Anuales

## Feature Overview
Enhance "Pagos Anuales" to track individual member payments, not just club-level bulk payments.

## Implementation Status
- [x] Phase 1: Backend - New MemberPayment Entity
- [x] Phase 2: Backend - Modify Annual Payment Flow
- [x] Phase 3: Frontend - Member Selection in Annual Payments
- [x] Phase 4: Frontend - Member Payment Status Display
- [x] Phase 5: QA Validation - Fixes Applied

## Files Created

### Backend

#### Domain Layer
- `backend/src/domain/entities/member_payment.py`
  - `MemberPayment` dataclass with fields: id, payment_id, member_id, club_id, payment_year, payment_type, concept, amount, status, created_at, updated_at
  - `MemberPaymentStatus` enum: pending, completed, refunded
  - `MemberPaymentType` enum: licencia_kyu, licencia_kyu_infantil, licencia_dan, titulo_fukushidoin, titulo_shidoin, seguro_accidentes, seguro_rc
  - Mapping `ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE` for converting annual payment types

#### Application Layer (Ports)
- `backend/src/application/ports/member_payment_repository.py`
  - Interface with methods: create, create_bulk, find_by_id, find_by_member_id, find_by_member_year, find_by_club_year, find_by_payment_id, find_unpaid_by_club_year, update, update_status_by_payment_id, delete, get_club_summary, exists_for_member_year_type

#### Application Layer (Use Cases)
- `backend/src/application/use_cases/member_payment/__init__.py`
- `backend/src/application/use_cases/member_payment/get_member_payment_status_use_case.py`
- `backend/src/application/use_cases/member_payment/get_member_payment_history_use_case.py`
- `backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py`
- `backend/src/application/use_cases/member_payment/get_unpaid_members_use_case.py`

#### Infrastructure Layer (Repository)
- `backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py`
  - MongoDB implementation with indexes on member_id+payment_year, club_id+payment_year+payment_type, payment_id

#### Infrastructure Layer (Web)
- `backend/src/infrastructure/web/dto/member_payment_dto.py`
  - Response DTOs for member payment status, history, club summary, unpaid members
  - Request DTO `MemberPaymentAssignment` for annual payment member assignments
- `backend/src/infrastructure/web/routers/member_payments.py`
  - Endpoints:
    - GET `/api/v1/member-payments/member/{member_id}` - Payment status
    - GET `/api/v1/member-payments/member/{member_id}/history` - Payment history
    - GET `/api/v1/member-payments/club/{club_id}/summary` - Club summary
    - GET `/api/v1/member-payments/club/{club_id}/unpaid` - Unpaid members list

### Frontend

#### Member Payments Feature
- `frontend/src/features/member-payments/data/schemas/member-payment.schema.ts`
  - Types for MemberPayment, PaymentTypeStatus, MemberPaymentStatusResponse, etc.
- `frontend/src/features/member-payments/data/services/member-payment.service.ts`
  - API calls for getMemberPaymentStatus, getMemberPaymentHistory, getClubPaymentSummary, getUnpaidMembers
- `frontend/src/features/member-payments/hooks/queries/useMemberPaymentQueries.ts`
  - React Query hooks for all member payment endpoints
- `frontend/src/features/member-payments/components/PaymentStatusBadge.tsx`
  - Visual indicator for paid/pending status
- `frontend/src/features/member-payments/components/MemberPaymentStatus.tsx`
  - Card showing all payment types with status for a member
- `frontend/src/features/member-payments/components/MemberPaymentHistory.tsx`
  - Table showing historical payments
- `frontend/src/features/member-payments/components/MemberSelectionTable.tsx`
  - Multi-select modal for assigning members to payment types
- `frontend/src/features/member-payments/index.ts`
  - Feature exports

#### Annual Payments Feature Updates
- `frontend/src/features/annual-payments/components/MemberSelectionSection.tsx`
  - New section in annual payment form for member assignment
- Modified files:
  - `frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts` - Added member_assignments
  - `frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx` - Added member selection state
  - `frontend/src/features/annual-payments/components/AnnualPaymentForm.tsx` - Added MemberSelectionSection
  - `frontend/src/features/annual-payments/components/index.ts` - Export new component

#### Members Feature Updates
- `frontend/src/features/members/components/MemberList.tsx`
  - Added "Pagos" column with button to view payment status dialog
  - Added Dialog with MemberPaymentStatus component

## Files Modified

### Backend
- `backend/src/domain/entities/payment.py` - Added `member_assignments` field
- `backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py` - Added member_assignments mapping
- `backend/src/infrastructure/web/dto/annual_payment_dto.py` - Added MemberPaymentAssignment DTO
- `backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
  - Added MemberAssignment dataclass
  - Added member_assignments parameter to execute()
  - Added _validate_member_assignments() method
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
  - Added MemberPaymentRepositoryPort dependency
  - Added _create_member_payments() method for creating records on payment completion
- `backend/src/infrastructure/web/routers/payments.py` - Pass member_assignments to use case
- `backend/src/infrastructure/web/dependencies.py` - Added member payment dependencies
- `backend/src/app.py` - Registered member_payments router

### Frontend
- `frontend/src/features/members/hooks/queries/useMemberQueries.ts` - Added options parameter for enabled flag

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/member-payments/member/{member_id}` | Get payment status for member |
| GET | `/api/v1/member-payments/member/{member_id}/history` | Get payment history |
| GET | `/api/v1/member-payments/club/{club_id}/summary` | Get club payment summary |
| GET | `/api/v1/member-payments/club/{club_id}/unpaid` | Get list of unpaid members |
| POST | `/api/v1/payments/annual/initiate` | Extended to accept member_assignments |

## Key Implementation Decisions

1. **Separate Entity**: MemberPayment is a new entity rather than embedding in Payment to allow flexible querying and clean separation of concerns.

2. **Bulk Creation**: Member payments are created in bulk when a club payment is completed via webhook, ensuring transactional consistency.

3. **Type Mapping**: Annual payment types (kyu, dan, etc.) are mapped to MemberPaymentType enums for consistency.

4. **Optional Assignment**: Member assignments are optional - clubs can still pay without assigning specific members for backward compatibility.

5. **Validation**: Assignment counts are validated against quantity counts to prevent over-assignment.

## Testing Notes

### Backend Verification
```bash
cd backend
poetry run python -c "from src.app import create_app; app = create_app(); print('OK')"
```

### Frontend Verification
The frontend compiles successfully. Pre-existing test errors in test files are not related to this feature.

## Acceptance Criteria

1. Admin can select specific members when making annual payments
2. Each member has a payment status showing paid/pending items
3. Club view shows member payment summary with filters
4. Historical payment records are available per member
5. Payment flow through Redsys creates MemberPayment records on success

## QA Validation Results (2026-01-30)

### Status: FIXES APPLIED

**Resolved Issues**:
1. Created missing Tooltip UI component (`/frontend/src/components/ui/tooltip.tsx`)
2. Added club change detection to clear member assignments automatically
3. Added deleted member handling in webhook processing

### Code Review Results (Completed)
✅ **Backend Implementation**:
- All 4 API endpoints properly implemented
- Use cases follow hexagonal architecture correctly
- Repository with MongoDB indexes configured
- DTOs and mappers properly structured
- Security: Authentication required on all endpoints
- Data integrity: Validation and atomic operations

✅ **Frontend Implementation**:
- Member selection section with conditional rendering
- Member selection modal with checkbox logic
- Payment status dialog integration in MemberList
- Payment status badge with visual indicators
- Type safety with TypeScript and Zod schemas
- Feature structure follows project conventions

⚠️ **Remaining Issues** (Non-Blocking):
1. Missing duplicate payment prevention in UI (P2 - future enhancement)
2. Accessibility needs E2E verification (P2 - manual testing recommended)

✅ **Fixed Issues**:
1. Created Tooltip component with Radix UI
2. Added club change detection to clear member assignments
3. Added deleted member handling in webhook processing

### Detailed Reports

See comprehensive validation reports:
- Acceptance Criteria: `.claude/doc/member_payments/acceptance_criteria.md`
- Feedback Report: `.claude/doc/member_payments/feedback_report.md`

## Configuration Fix (2026-02-01)

### Issue: Redsys TDES Key Invalid Error
The backend was throwing `ValueError: Not a valid TDES key` because the `.env` file was missing Redsys configuration.

### Solution
Added Redsys sandbox credentials to `backend/.env`:
```
# Redsys Payment Gateway (Sandbox)
REDSYS_MERCHANT_CODE=999008881
REDSYS_TERMINAL=1
REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7
REDSYS_ENVIRONMENT=test
REDSYS_CURRENCY=978
```

These are Redsys's standard test environment credentials. After adding, restart the backend server for changes to take effect.
