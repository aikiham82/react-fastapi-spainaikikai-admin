# Club Fee Bug Fix - COMPLETED

## Bug Description
Two bugs in production with club "Musubi Aikido Murcia" (2026):
1. Payment summary page doesn't show club annual fee even though it was paid
2. New payment form still allows selecting annual fee even though already paid

## Root Cause
`club_fee` is included in `line_items_data` JSON but NOT in `member_assignments` JSON. The webhook `_create_member_payments` only iterates `member_assignments` to create `MemberPayment` records, so no `CUOTA_CLUB` record is ever created.

Both the summary and prefill check `member_payments` collection for `CUOTA_CLUB` → find nothing → think it's not paid.

## Fix Plan
1. **Backend webhook**: Fix `_create_member_payments` to also check `line_items_data` for `club_fee` and create a `CUOTA_CLUB` MemberPayment record
2. **Backend prefill**: Add `club_fee_already_paid` field to response so frontend can disable checkbox
3. **Backend initiate**: Add server-side validation to reject double club fee payment
4. **Frontend**: Disable checkbox when `club_fee_already_paid` is true, show indicator
5. **Production data**: Create missing `CUOTA_CLUB` records for existing transactions

## Affected Files
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
- `backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py`
- `backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
- `backend/src/infrastructure/web/routers/payments.py` (DTO for prefill response)
- `frontend/src/features/annual-payments/components/ClubFeeSection.tsx`
- `frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts`
- `frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx`
