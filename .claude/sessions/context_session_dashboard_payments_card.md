# Dashboard Payments Card Improvement

## Feature Description
Replace the current "Pagos" card in the main dashboard with a more informative version showing:
1. **Main metric**: Ratio of clubs paid/total (e.g., "32/53")
2. **Secondary line 1**: Number of clubs pending payment
3. **Secondary line 2**: Number of expired licenses

## Design Decisions
- **Card layout**: Single improved card (same position, no layout changes)
- **Main metric**: `clubs_paid/total_clubs` as the big number, subtitle "Clubs al día"
- **Club paid criteria**: A club "has paid" if it has at least 1 completed annual payment (`transactions` collection with `payment_year=current_year`, `status=completed`)
- **Expired licenses**: Only licenses with `status=expired` (already expired, not upcoming)
- Fields to remove from API: `annual_payments`, `pending_payments`
- Fields to add to API: `clubs_paid`, `clubs_pending`, `expired_licenses`

## Current Implementation

### Backend: `/backend/src/infrastructure/web/routers/dashboard.py`
- `DashboardStats` Pydantic model (line 17-25)
- Stats calculation in `get_dashboard_stats()` (line 66-282)
- Current payment logic: counts active members and member_payments (lines 88-116)
- Club-scoped filtering via `get_club_filter_ctx(ctx)` (line 75)

### Frontend:
- `Dashboard.tsx` (line 84-93): Current Pagos card
- `dashboard.schema.ts`: `DashboardStats` interface with `annual_payments`, `pending_payments`
- `dashboard.service.ts`: API call to `/api/dashboard/stats`

### Key Collections
- `transactions`: Club-level payments with `club_id`, `payment_year`, `status`
- `licenses`: License records with `status`, `expiration_date`
- `clubs`: Club records
- `members`: Member records with `club_id`

## Subagent Recommendations

### Backend Developer Analysis (Completed)

**Documentation**: `.claude/doc/dashboard_payments_card/backend.md`

**Key Implementation Details**:

1. **Data Model Changes**:
   - Pydantic model `DashboardStats` updated to replace `annual_payments`, `pending_payments` with `clubs_paid`, `clubs_pending`, `expired_licenses`
   - Uses `transactions` collection (club-level) instead of `member_payments` (member-level)

2. **Clubs Paid Logic**:
   - Super admin: MongoDB aggregation pipeline to count distinct `club_id` values with `payment_year=current_year` and `status=completed`
   - Club admin: Simple count check - returns 1 if their club has any completed payment, 0 otherwise
   - `clubs_pending = total_clubs - clubs_paid`

3. **Expired Licenses Logic**:
   - Simple query: count licenses where `status="expired"`
   - Already respects club_id filtering via existing `license_filter`

4. **Key Edge Cases Handled**:
   - Empty transactions collection (no payments yet): `clubs_paid = 0`
   - Club with multiple payments: counts as 1 club (distinct count)
   - Old year payments: filtered out by `payment_year` check
   - Incomplete payments (pending/failed): not counted (only `status=completed`)

5. **Performance**:
   - Efficient aggregation pipeline for distinct club counts
   - Optional index recommendations: `(payment_year, status, club_id)` on transactions, `(status, club_id)` on licenses

6. **Breaking Changes**:
   - API response structure changed - frontend must update schema
   - Semantic meaning changed from member-focused to club-focused metrics

**Status**: Implementation plan complete. Ready for execution phase.
