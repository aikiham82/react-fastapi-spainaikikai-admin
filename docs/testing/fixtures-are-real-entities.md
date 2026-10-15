# 🎯 Test fixtures are built from the real entity

## 💡 Convention

A test that feeds a router, mapper or use case builds its data with the domain entity (`Invoice(...)`, `Member(...)`), never with a `SimpleNamespace` or `MagicMock` that lists fields by hand. On the frontend, a fixture is typed with the feature's schema type so the compiler checks its shape.

## 🏆 Benefits

- A hand-written fake carries whatever fields the code reads, so the test passes while production breaks. The invoice response read `license_id`, `tax_amount`, `total_amount` and `paid_date`, which `Invoice` never had; its test used a `SimpleNamespace` with those same fields, and `GET /invoices` answered 500 as soon as the first real invoice existed.
- Renaming or removing an entity field turns the fixture red at once.

## 👀 Examples

### ✅ Good

```python
def invoice_of(club_id, invoice_id="invoice-id"):
    return Invoice(
        id=invoice_id, invoice_number="2026-0001", payment_id="payment-id", member_id=OWN_MEMBER,
        club_id=club_id, customer_name="Club Example", status=InvoiceStatus.PAID,
        subtotal=10.0, tax_total=0.0, total=10.0,
    )
```

### ❌ Bad

```python
def invoice_of(club_id):
    return SimpleNamespace(club_id=club_id, license_id=None, tax_amount=0.0, total_amount=10.0, ...)
```

## 🧐 Real world examples

- [`backend/tests/api/test_invoices_club_scoping.py`](../../backend/tests/api/test_invoices_club_scoping.py)
- [`frontend/src/features/invoices/components/__tests__/InvoiceList.test.tsx`](../../frontend/src/features/invoices/components/__tests__/InvoiceList.test.tsx)

## 🔗 Related agreements

- [`testing-strategy.md`](testing-strategy.md)
- [`no-production-data.md`](no-production-data.md)
