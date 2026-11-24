# 🎯 An uncharged payment selection comes back

## 💡 Convention

When a club opens the annual payment screen for a year and its **latest** annual payment of that year was never charged (`pending`, `processing` or `failed`), the prefill returns that payment's selection instead of "everything pending", with `source="unfinished_payment"`, and the screen says so.

- Only the latest payment of the club and year counts. A later `completed`, `cancelled` or `refunded` payment means there is nothing to resume.
- What has been paid since is removed, and so are members who are no longer active in the club.
- Members created **after** that attempt get their default pending items, so a newcomer is never left unticked.
- The payer name is the caller's, never the one stored on the payment, which can be the username of whoever started it.
- An unreadable stored selection, or one with nothing left to tick, falls back to the default prefill with no notice.

## 🏆 Benefits

- Guille, 23/11/2026: a club that filled the selection and could not finish the card payment had to tick every member again.
- In production, most abandoned attempts end as `failed`, not `processing`, so `failed` must be resumable.
- Resuming only suggests ticks. The charge-once guards in the initiate use case still run on every payment.

## 👀 Examples

### ✅ Good: the latest attempt failed, one member paid since

A club ticked Ana and Luis, the card payment failed, and Ana's licence was later paid by transfer. Reopening the screen ticks only Luis and shows "Hemos dejado marcado lo que elegiste en tu último pago, que no llegó a completarse."

### ❌ Bad: resuming any old unfinished payment

A failed attempt in January followed by a completed payment in March resumes January's selection. Only the latest payment of the year counts.

## 🧐 Real world examples

- [`prefill_annual_payment_use_case.py`](../../backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py) (`_resume_unfinished_payment`)
- [`mongodb_payment_repository.py`](../../backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py) (`find_latest_annual`)
- [`useAnnualPaymentContext.tsx`](../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx)

## 🔗 Related agreements

- [Payments never guess paid state](payments-never-guess-paid-state.md)
- [A payment is fulfilled once](a-payment-is-fulfilled-once.md)
