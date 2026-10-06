# 🎯 An invoice is built the same way on every payment path

## 💡 Convention

Every use case that issues an `Invoice` (today the Redsys webhook and the manual payment) builds it with the same fields and the same fallbacks:

- Pass **only fields the `Invoice` dataclass declares**. It has no `license_id` and no `paid_date`.
- `member_id` is `payment.member_id or payment.club_id`. A club payment has no member, and `Invoice.__post_init__` refuses an empty `member_id`.
- `issue_date` is a naive `datetime.utcnow()`, never an ISO string and never `datetime.now()`.
- Call `invoice.calculate_totals()` before saving.

When one path changes how it builds the invoice, change the other in the same commit.

## 🏆 Benefits

- The webhook catches any invoice error, logs it and still marks the payment as completed. A wrong field never fails the request: the club pays and silently gets no invoice and no PDF in its email. Only Sentry shows it.
- Both paths were written separately. The manual payment was fixed in commit `73cb514`, and the webhook kept the broken construction until SPAIN-AIKIKAI-3. Keeping them identical stops one path from drifting again.
- A naive `utcnow()` is what Mongo compares correctly against every other stored date (see the data model).

## 👀 Examples

### ✅ Good: entity fields only, club fallback, naive UTC date

```python
invoice = Invoice(
    invoice_number=invoice_number,
    payment_id=payment.id,
    member_id=payment.member_id or payment.club_id,
    club_id=payment.club_id,
    customer_name=customer_name,
    customer_email=customer_email,
    line_items=line_items,
    status=InvoiceStatus.ISSUED,
    issue_date=datetime.utcnow(),
)
invoice.calculate_totals()
```

### ❌ Bad: fields the entity lacks, empty member, string dates

```python
invoice = Invoice(
    invoice_number=invoice_number,
    payment_id=payment.id,
    member_id=payment.member_id or "",
    club_id=payment.club_id,
    license_id=payment.related_entity_id,
    customer_name=customer_name,
    customer_email=customer_email,
    line_items=line_items,
    status=InvoiceStatus.ISSUED,
    issue_date=datetime.now().isoformat(),
    paid_date=datetime.now().isoformat()
)
```

It raises `TypeError: Invoice.__init__() got an unexpected keyword argument 'license_id'`. Without that line, it would raise `ValueError: Member ID is required` for every club payment.

## 🧐 Real world examples

- [`register_manual_payment_use_case.py`](../../backend/src/application/use_cases/payment/register_manual_payment_use_case.py): `_create_invoice`.
- [`process_redsys_webhook_use_case.py`](../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py): `_create_invoice`, fixed in commit `37fa1fe` (Sentry SPAIN-AIKIKAI-3).
- [`test_process_redsys_webhook_invoice.py`](../../backend/tests/application/use_cases/payment/test_process_redsys_webhook_invoice.py): a club annual payment with no member gets an invoice.

## 🔗 Related agreements

- [`data-model.md`](data-model.md): Mongo stores naive datetimes.
- [`payment-cycles.md`](payment-cycles.md): what a club payment covers.

Invoiced on every path by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
