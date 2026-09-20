# Backend Implementation Plan: Dashboard Payments Card Improvement

## Overview
Replace the current "Pagos" card statistics computation in the dashboard endpoint to show:
1. **clubs_paid**: Number of clubs with at least 1 completed annual payment for current year
2. **clubs_pending**: Number of clubs without completed annual payment (total_clubs - clubs_paid)
3. **expired_licenses**: Count of licenses with status="expired"

Remove the old member-based payment logic that computed `annual_payments` and `pending_payments`.

---

## Context Analysis

### Current Implementation
**File**: `/backend/src/infrastructure/web/routers/dashboard.py`

**Current payment logic (lines 88-116)**:
- Queries `member_payments` collection (NOT `transactions`)
- Counts active members as `annual_payments`
- Computes `pending_payments` by finding active members without completed payments

**Problem**: This is member-focused, but we need club-focused metrics based on the `transactions` collection.

### Data Model Understanding

**transactions collection**:
- Fields: `club_id`, `payment_year`, `status`, `amount`, `payment_type`, etc.
- Status enum: `pending`, `processing`, `completed`, `failed`, `refunded`, `cancelled`
- Used for club-level annual payments
- One transaction can cover multiple members (via `member_assignments` JSON field)

**licenses collection**:
- Fields: `status`, `expiration_date`, `member_id`, etc.
- Status enum: `active`, `expired`, `pending`, `revoked`
- Already has club_id filtering in place via `license_filter` (line 77)

**Current club_id filtering**:
```python
club_id = get_club_filter_ctx(ctx)
license_filter = {"club_id": club_id} if club_id else {}
```
- For super_admin: `club_id = None`, no filtering
- For club_admin: `club_id = their_club_id`, filters to their club only

---

## Implementation Plan

### 1. Update DashboardStats Pydantic Model

**File**: `/backend/src/infrastructure/web/routers/dashboard.py` (lines 17-26)

**Current**:
```python
class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_clubs: int
    total_members: int
    active_members: int
    annual_payments: int         # REMOVE
    pending_payments: int        # REMOVE
    upcoming_seminars: int
    expiring_licenses: int
```

**New**:
```python
class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_clubs: int
    total_members: int
    active_members: int
    clubs_paid: int              # ADD - clubs with completed payment
    clubs_pending: int           # ADD - clubs without completed payment
    upcoming_seminars: int
    expired_licenses: int        # RENAME from expiring_licenses
```

**Rationale**: Align model with new business requirements. Note we're also renaming `expiring_licenses` to `expired_licenses` to better reflect its purpose.

---

### 2. Remove Old Payment Logic

**File**: `/backend/src/infrastructure/web/routers/dashboard.py` (lines 88-116)

**Remove entire section**:
```python
# Annual member payments (current year) - based on active members
current_year = now.year

# annual_payments = count of active members (members who should pay)
annual_payments = active_members

# pending_payments = active members without completed payment for current year
# Get active member IDs for the filter
active_members_cursor = db["members"].find(
    {**member_filter, "status": "active"}, {"_id": 1}
)
active_member_docs = await active_members_cursor.to_list(length=10000)
active_member_ids = [str(doc["_id"]) for doc in active_member_docs]

# Get member IDs with completed payments for current year
# MongoDB returns empty cursor for non-existent collections, no error handling needed
paid_members_cursor = db["member_payments"].find(
    {
        "payment_year": current_year,
        "member_id": {"$in": active_member_ids},
        "status": "completed"
    },
    {"member_id": 1}
)
paid_member_docs = await paid_members_cursor.to_list(length=10000)
paid_member_ids = {doc["member_id"] for doc in paid_member_docs}

# pending_payments = active members - members with completed payment
pending_payments = len(set(active_member_ids) - paid_member_ids)
```

**Rationale**: This queries the wrong collection and doesn't match our new requirements.

---

### 3. Add New Clubs Paid Logic

**File**: `/backend/src/infrastructure/web/routers/dashboard.py`

**Insert after line 87** (after `active_members` calculation):

```python
# Clubs with completed annual payments (current year)
current_year = now.year

# Query transactions for completed payments in current year
if club_id:
    # Club admin: check if their club has paid
    # Query: club_id matches AND payment_year = current_year AND status = completed
    clubs_paid_count = await db["transactions"].count_documents({
        "club_id": club_id,
        "payment_year": current_year,
        "status": "completed"
    })
    # For club admin: clubs_paid is either 0 or 1
    clubs_paid = 1 if clubs_paid_count > 0 else 0
else:
    # Super admin: count unique clubs with completed payments
    # Use aggregation pipeline to get distinct club_ids
    pipeline = [
        {
            "$match": {
                "payment_year": current_year,
                "status": "completed"
            }
        },
        {
            "$group": {
                "_id": "$club_id"
            }
        },
        {
            "$count": "total"
        }
    ]
    result = await db["transactions"].aggregate(pipeline).to_list(length=1)
    clubs_paid = result[0]["total"] if result else 0

# Clubs pending payment
clubs_pending = total_clubs - clubs_paid
```

**Important implementation notes**:

1. **Club admin handling**:
   - If `club_id` is set (club admin context), we simply check if their club has ANY completed transaction for current year
   - Result is binary: 0 or 1
   - Use `count_documents()` which is simpler and efficient for this case

2. **Super admin handling**:
   - Use MongoDB aggregation pipeline to get distinct club_ids
   - `$match` filters to completed payments for current year
   - `$group` by `club_id` to get unique clubs
   - `$count` gives us the total distinct clubs
   - Handle empty result (no completed payments yet)

3. **Edge cases**:
   - No transactions exist: `clubs_paid = 0`, `clubs_pending = total_clubs`
   - All clubs paid: `clubs_paid = total_clubs`, `clubs_pending = 0`
   - Club admin with no payment: `clubs_paid = 0`, `clubs_pending = 1` (their total_clubs = 1)

4. **Performance**:
   - Aggregation pipeline is efficient for distinct counts
   - No need to load documents into memory
   - Index on `payment_year` + `status` would help (optional optimization)

---

### 4. Update Expired Licenses Logic

**File**: `/backend/src/infrastructure/web/routers/dashboard.py` (lines 124-129)

**Current** (counts licenses EXPIRING in next 30 days):
```python
# Expiring licenses (next 30 days)
expiring_licenses_count = await db["licenses"].count_documents({
    **license_filter,
    "expiration_date": {"$gte": now, "$lte": now + timedelta(days=30)},
    "status": "active"
})
```

**New** (counts licenses ALREADY expired):
```python
# Expired licenses (already expired, not upcoming)
expired_licenses_count = await db["licenses"].count_documents({
    **license_filter,
    "status": "expired"
})
```

**Rationale**:
- Requirements specify "expired licenses" not "expiring licenses"
- Simply query by `status = "expired"`
- The `license_filter` already handles club_id scoping (line 77)
- Much simpler query - no date comparison needed

**Note**: Keep the existing "Expiring licenses details" section (lines 141-171) as is - it's for the separate expiring licenses list card, not the stats card.

---

### 5. Update DashboardStats Construction

**File**: `/backend/src/infrastructure/web/routers/dashboard.py` (lines 131-139)

**Current**:
```python
stats = DashboardStats(
    total_clubs=total_clubs,
    total_members=total_members,
    active_members=active_members,
    annual_payments=annual_payments,
    pending_payments=pending_payments,
    upcoming_seminars=upcoming_seminars_count,
    expiring_licenses=expiring_licenses_count
)
```

**New**:
```python
stats = DashboardStats(
    total_clubs=total_clubs,
    total_members=total_members,
    active_members=active_members,
    clubs_paid=clubs_paid,
    clubs_pending=clubs_pending,
    upcoming_seminars=upcoming_seminars_count,
    expired_licenses=expired_licenses_count
)
```

**Changes**:
- Replace `annual_payments` with `clubs_paid`
- Replace `pending_payments` with `clubs_pending`
- Replace `expiring_licenses` with `expired_licenses`

---

## Complete Modified Code Section

Here's the complete replacement for lines 88-139 in `/backend/src/infrastructure/web/routers/dashboard.py`:

```python
# Clubs with completed annual payments (current year)
current_year = now.year

# Query transactions for completed payments in current year
if club_id:
    # Club admin: check if their club has paid
    # Query: club_id matches AND payment_year = current_year AND status = completed
    clubs_paid_count = await db["transactions"].count_documents({
        "club_id": club_id,
        "payment_year": current_year,
        "status": "completed"
    })
    # For club admin: clubs_paid is either 0 or 1
    clubs_paid = 1 if clubs_paid_count > 0 else 0
else:
    # Super admin: count unique clubs with completed payments
    # Use aggregation pipeline to get distinct club_ids
    pipeline = [
        {
            "$match": {
                "payment_year": current_year,
                "status": "completed"
            }
        },
        {
            "$group": {
                "_id": "$club_id"
            }
        },
        {
            "$count": "total"
        }
    ]
    result = await db["transactions"].aggregate(pipeline).to_list(length=1)
    clubs_paid = result[0]["total"] if result else 0

# Clubs pending payment
clubs_pending = total_clubs - clubs_paid

# Upcoming seminars (next 30 days)
upcoming_seminars_count = await db["seminars"].count_documents({
    "start_date": {"$gte": now, "$lte": now + timedelta(days=30)},
    "status": {"$ne": "cancelled"}
})

# Expired licenses (already expired, not upcoming)
expired_licenses_count = await db["licenses"].count_documents({
    **license_filter,
    "status": "expired"
})

stats = DashboardStats(
    total_clubs=total_clubs,
    total_members=total_members,
    active_members=active_members,
    clubs_paid=clubs_paid,
    clubs_pending=clubs_pending,
    upcoming_seminars=upcoming_seminars_count,
    expired_licenses=expired_licenses_count
)
```

---

## Testing Considerations

### Unit Test Scenarios

1. **Super admin - no transactions**:
   - Empty `transactions` collection
   - Expected: `clubs_paid = 0`, `clubs_pending = total_clubs`

2. **Super admin - some clubs paid**:
   - 3 clubs total
   - Club A has completed payment for current year
   - Club B has completed payment for current year
   - Club C has no payment
   - Expected: `clubs_paid = 2`, `clubs_pending = 1`

3. **Super admin - club with multiple payments**:
   - Club A has 2 completed payments for current year
   - Expected: Club A counts as 1 in `clubs_paid` (not 2)

4. **Super admin - old year payments**:
   - Club A has completed payment for 2023
   - Current year is 2026
   - Expected: Club A NOT counted in `clubs_paid`

5. **Super admin - incomplete payments**:
   - Club A has pending payment for current year
   - Club B has failed payment for current year
   - Expected: `clubs_paid = 0` (only completed status counts)

6. **Club admin - their club has paid**:
   - Club admin for Club A
   - Club A has completed payment for current year
   - Expected: `total_clubs = 1`, `clubs_paid = 1`, `clubs_pending = 0`

7. **Club admin - their club hasn't paid**:
   - Club admin for Club B
   - Club B has no completed payment for current year
   - Expected: `total_clubs = 1`, `clubs_paid = 0`, `clubs_pending = 1`

8. **Expired licenses - super admin**:
   - 10 licenses with status="expired"
   - 5 licenses with status="active" but expiration_date in past
   - Expected: `expired_licenses = 10` (only count by status)

9. **Expired licenses - club admin**:
   - Club admin for Club A
   - Club A has 3 expired licenses
   - Other clubs have 5 expired licenses
   - Expected: `expired_licenses = 3` (filtered by club_id)

### Integration Test Scenarios

1. **API endpoint returns correct structure**:
   - Call GET `/api/dashboard/stats`
   - Verify response has `clubs_paid`, `clubs_pending`, `expired_licenses`
   - Verify response does NOT have `annual_payments`, `pending_payments`

2. **Database queries use correct collections**:
   - Verify queries hit `transactions` collection (not `member_payments`)
   - Verify queries use correct filters for `payment_year` and `status`

### Edge Cases

1. **Null club_id in transaction**:
   - Transaction exists but `club_id` is null/missing
   - MongoDB aggregation will group nulls together
   - Result: Counted as 1 "club" with null ID
   - **Recommendation**: Data validation should prevent this, but won't crash

2. **Future payment_year**:
   - Transaction has `payment_year = 2027` (future year)
   - Current year is 2026
   - Expected: NOT counted (query filters by current_year)

3. **Club deleted but transaction exists**:
   - Club A deleted from `clubs` collection
   - Transaction for Club A still exists in `transactions`
   - Expected: `total_clubs` won't include deleted club, but `clubs_paid` might
   - Result: `clubs_pending` could be negative
   - **Recommendation**: Ensure club deletion cascades or archives transactions

4. **License without expiration_date**:
   - License has `status = "expired"` but no `expiration_date`
   - Expected: Still counted in `expired_licenses` (we only check status)

---

## Database Indexes (Optional Optimization)

For optimal performance, consider adding indexes:

```javascript
// transactions collection
db.transactions.createIndex({ "payment_year": 1, "status": 1, "club_id": 1 })

// licenses collection
db.licenses.createIndex({ "status": 1, "club_id": 1 })
```

These indexes will speed up:
- Clubs paid aggregation pipeline
- Expired licenses count
- Club-scoped filtering for club_admin users

---

## Migration Notes

### Breaking Changes

1. **API Response Structure Changed**:
   - Frontend must update `DashboardStats` schema to remove `annual_payments`, `pending_payments`
   - Frontend must add `clubs_paid`, `clubs_pending`, `expired_licenses` fields

2. **Semantic Meaning Changed**:
   - Old: "Annual payments" meant active members
   - New: "Clubs paid" means clubs with completed transactions
   - Frontend display logic must update accordingly

### Non-Breaking Changes

1. **No database schema changes**: All collections already have required fields
2. **No new dependencies**: Uses existing MongoDB driver features
3. **Backwards compatible**: Old endpoints unchanged, only `/dashboard/stats` modified

---

## Files Modified

### Primary File
- `/backend/src/infrastructure/web/routers/dashboard.py`
  - Lines 17-26: Update `DashboardStats` model
  - Lines 88-116: Remove old payment logic
  - Lines 88-139: Add new clubs paid, expired licenses logic
  - Line 131-139: Update stats construction

### No Changes Needed
- Payment repository: Already queries `transactions` collection correctly
- License entity: Already has `status` enum with `expired` value
- Database collections: Schema already supports new queries
- Dependencies: No new dependencies required

---

## Rollback Plan

If issues arise:

1. **Revert DashboardStats model**:
   - Add back `annual_payments` and `pending_payments`
   - Remove `clubs_paid`, `clubs_pending`, `expired_licenses`

2. **Revert query logic**:
   - Restore lines 88-116 from git history
   - Revert stats construction to use old fields

3. **Database**: No rollback needed (no schema changes)

4. **Frontend**: Coordinate rollback with frontend changes

---

## Summary

This implementation plan provides a clean, efficient solution for computing club-level payment statistics based on the `transactions` collection. Key improvements:

1. **Correct data source**: Uses `transactions` (club-level) instead of `member_payments` (member-level)
2. **Efficient queries**: MongoDB aggregation for distinct club counts, simple status filter for expired licenses
3. **Proper scoping**: Respects club_id filtering for club_admin users
4. **Edge case handling**: Handles empty collections, null results, and boundary conditions
5. **Maintainable**: Clear code with comments explaining business logic

The changes are isolated to one file and follow the existing patterns in the codebase.
