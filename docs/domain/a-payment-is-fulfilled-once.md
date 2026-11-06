# 🎯 A payment is fulfilled once

## 💡 Convention

Every path that turns a payment into "paid" (today the Redsys webhook and a super admin confirming an unfinished payment) hands it to `CompletePaymentUseCase`, and nothing else creates its member lines, licences, insurance, invoice or confirmation email.

- `CompletePaymentUseCase.execute` first **claims** the payment with `payment_repository.claim_unfinished(payment_id)`: one conditional update from `pending`/`processing`. Only the caller that wins the claim fulfils it; any other gets `PaymentAlreadyCompletedError`.
- A late Redsys notice never rewrites a finished payment: a success for a completed order is acknowledged without fulfilling it, and a failure only applies through `claim_unfinished(payment_id, PaymentStatus.FAILED)`.
- Before confirming an offline payment, `refuse_lines_already_paid` rejects any member line already paid for its year (the same rule the manual payment uses), so an abandoned card attempt that a later retry already paid cannot be charged twice.
- Only `CONFIRMABLE_PAYMENT_TYPES` (annual, seminar oficialidad and exam fee) can be confirmed: they carry what they bought (`member_assignments`, `related_entity_id`, the exam line).
- **An item is charged once.** Starting a card payment answers `400` if an unfinished annual payment of the club, started in the last 20 minutes, already pays that member and item (the slowest of 22 real payments took 10.2 minutes); a licence compares the year, an insurance does not, since it covers today's season. The bank charges before the lines exist, so if two payments still get through, the second one completes without repeating lines or licences and reports to Sentry, with ids only, that money must be returned by hand: **a duplicate never fails a completion**. A pending line does not count as paid. The last barrier is the index `unique_completed_line` (`scripts/create_member_payment_unique_index.py`), which `create_bulk` tolerates and reports the same way. Sentry is the only record of the amount to return: the payment keeps the full amount, but editing one of its lines recomputes it as the sum of its lines. A payment whose bank form fails is marked failed at once, so it blocks nobody.

## 🏆 Benefits

- A club that starts a card payment, abandons it and pays by transfer leaves a `processing` payment behind; confirming it creates exactly what the card payment would have, once.
- QA sent five simultaneous confirmations of one payment: one `200`, four `409`, one invoice.
- The webhook and the confirmation share one implementation, so a new side effect (a new kind of licence, a new email) cannot be added to one path and forgotten in the other.

## 👀 Examples

### ✅ Good: claim, then fulfil

```python
await refuse_lines_already_paid(member_payment_repository, lines, payment.payment_year, datetime.utcnow())
payment.confirm_received(PaymentMethod.TRANSFER)
completed = await complete_payment_use_case.execute(payment)  # claims first, raises if already completed
```

### ❌ Bad: read, check, write

```python
payment = await payment_repository.find_by_id(payment_id)
if payment.status == PaymentStatus.PROCESSING:  # two requests both see processing
    payment.status = PaymentStatus.COMPLETED
    await payment_repository.update(payment)
    await create_member_payments(payment)        # ...and both create the lines and the invoice
```

## 🧐 Real world examples

- [`complete_payment_use_case.py`](../../backend/src/application/use_cases/payment/complete_payment_use_case.py): the claim and the fulfilment.
- [`confirm_payment_received_use_case.py`](../../backend/src/application/use_cases/payment/confirm_payment_received_use_case.py): `POST /payments/{id}/confirm`.
- [`process_redsys_webhook_use_case.py`](../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py): success and failure notices.
- [`refuse_lines_already_paid.py`](../../backend/src/application/use_cases/payment/refuse_lines_already_paid.py): shared with the manual payment.

## 🔗 Related agreements

- [`invoice-creation.md`](invoice-creation.md): how the invoice itself is built.
- [`payments-never-guess-paid-state.md`](payments-never-guess-paid-state.md)
- [`payment-cycles.md`](payment-cycles.md)

Fulfilled exactly once by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
