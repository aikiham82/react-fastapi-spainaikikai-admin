# Session Context: Fix 409 Conflict on Remaining Annual Payments

## Problem
Club admins get a **409 Conflict** when paying for remaining members after an initial annual payment. The club-level duplicate check in `initiate_annual_payment_use_case.py` blocks ANY new `ANNUAL_QUOTA` payment for the same club+year once one exists with COMPLETED/PROCESSING status.

## Root Cause
`initiate_annual_payment_use_case.py:158-163` used `find_by_club_type_year()` to check for existing COMPLETED/PROCESSING payments at the **club level**, raising `DuplicatePaymentForYearError`.

## Changes Made

### 1. `backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
- **Added** `MemberPaymentRepositoryPort` dependency to `__init__`
- **Replaced** club-level duplicate check with **member-level** duplicate guard
- Queries `MemberPayment` records for assigned member IDs + year with COMPLETED status
- Builds `(member_id, item_type)` pairs and checks for conflicts
- Raises `ValueError` (caught as 400 by router) listing specific conflicts
- Allows multiple payments per club per year (legitimate batch use case)

### 2. `backend/src/infrastructure/web/dependencies.py`
- **Added** `get_member_payment_repository()` to `get_initiate_annual_payment_use_case()` DI

### 3. `backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py`
- **Lifted** `existing_mp` variable to wider scope (initialized as `[]` before the `if` block)
- **Replaced** `find_by_club_type_year` club fee check with `MemberPayment` check for `CUOTA_CLUB` type
- Club fee is now determined by whether a `CUOTA_CLUB` MemberPayment exists (not by whether any club-level Payment exists)

### 4. `backend/tests/application/use_cases/payment/test_prefill_annual_payment_use_case.py`
- Updated `test_prefill_club_fee_already_paid` to mock `member_payment_repository` with a `CUOTA_CLUB` MemberPayment record instead of relying on `find_by_club_type_year`

## What Did NOT Change
- `DuplicatePaymentForYearError` — still used by individual payment use cases
- `find_by_club_type_year` — still used in prefill fallback (previous year) and by other use cases
- Router error handling — `ValueError` already caught (returns 400)
- Frontend — no changes needed

## Test Results
- All 478 tests pass, 0 failures
- 14 annual_payment-related tests all pass

## Status: COMPLETED
