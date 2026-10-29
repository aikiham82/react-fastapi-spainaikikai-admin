# 🎯 A payment line shows a date only when it is paid

## 💡 Convention

A member payment line (`member_payments`) has no date of its own. Its paid date and method come from the transaction it points to (`payment_id` → `transactions`), and they are shown only when **both** are completed:

- The line is `completed` **and** its transaction is `COMPLETED`: show "Pagado el {fecha} · {método}".
- The line is `completed` but its transaction has no date, is missing or is not completed: show "Sin fecha de pago".
- The line is not completed: show no paid text at all, even if its transaction completed (one transaction covers many members and concepts).
- A transaction without `payment_method` is an early Redsys payment from before that field existed: the domain default `redsys` is correct, not a guess.

The join lives in `GetMemberPaymentHistoryUseCase`, which returns each line paired with its completed payment; the router only copies fields.

## 🏆 Benefits

- A refunded or pending payment never reads as "Pagado el …" next to a badge that says otherwise.
- An admin can check a claimed payment's date before marking a line as paid.

## 👀 Examples

### ✅ Good: gate on both statuses in the use case

```python
completed_payments=[payment_by_id.get(p.payment_id) if p.is_completed else None for p in payments]
```

### ❌ Bad: take the transaction date whatever the statuses

```python
paid_at=transactions[p.payment_id].payment_date
```

## 🧐 Real world examples

- [`get_member_payment_history_use_case.py`](../../backend/src/application/use_cases/member_payment/get_member_payment_history_use_case.py)
- [`payment-labels.ts`](../../frontend/src/features/club-payments/utils/payment-labels.ts) (`getPaidLabel`)
- [`test_member_payment_history_paid_at.py`](../../backend/tests/api/test_member_payment_history_paid_at.py)

## 🔗 Related agreements

- [The payments page never guesses what is already paid](payments-never-guess-paid-state.md)
- [Payment cycles](payment-cycles.md)
