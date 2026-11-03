# 🎯 Money is limited where it enters, never where it is read

## 💡 Convention

Every money field of a **request** DTO uses `Money` ([`money.py`](../../backend/src/infrastructure/web/dto/money.py)): finite, not negative and at most 1,000,000. Excel imports parse money with `_money`, which applies the same type.

**Response** DTOs keep a plain `float`. When a base class is shared, the base stays `float` and the request class overrides the field. A total is a sum and can exceed what a single input may hold, and a stored value must always be readable.

A payment request has a size too ([`payment_lines.py`](../../backend/src/infrastructure/web/dto/payment_lines.py)): no repeated type in a member, no repeated member, at most 500 members and 1000 lines, and names of at most 200 characters. A single request once stored 14,300 lines.

A `422` never carries the submitted `input` (`request_validation_handler` in [`app.py`](../../backend/src/app.py)). The API client turns the resulting field list into one message, because a toast cannot render a list ([`readableDetail.ts`](../../frontend/src/core/data/readableDetail.ts)).

## 🏆 Benefits

- `float` accepts `Infinity`, `NaN` and `1e400`. They were stored, and then every JSON response holding one answered 500, including the listings of the whole federation.
- A finite limit also stops two values near the float maximum from adding up to `Infinity` in a parent payment.
- FastAPI's default 422 echoes the input and cannot render a non-finite number, so refusing it with `FiniteFloat` alone still answered 500. Without the echo, a 5 MB value no longer comes back to the caller either.

## 👀 Examples

### ✅ Good: the limit on the request class only

```python
class PaymentBase(BaseModel):
    amount: float

class PaymentCreate(PaymentBase):
    amount: Money

class PaymentResponse(PaymentBase):
    ...
```

### ❌ Bad: the limit on a base class that responses inherit

```python
class PaymentBase(BaseModel):
    amount: Money
```

On 2026-11-02 QA stored a manual payment whose lines added up to 1,001,000. No request carried that total, so nothing refused it, and `PaymentResponse` then made `GET /payments` answer 500 for everyone.

## 🧐 Real world examples

- [`payment_dto.py`](../../backend/src/infrastructure/web/dto/payment_dto.py), [`seminar_dto.py`](../../backend/src/infrastructure/web/dto/seminar_dto.py), [`insurance_dto.py`](../../backend/src/infrastructure/web/dto/insurance_dto.py), [`price_configuration_dto.py`](../../backend/src/infrastructure/web/dto/price_configuration_dto.py): request classes override the base field.
- [`import_export.py`](../../backend/src/infrastructure/web/routers/import_export.py): `_money`.

## 🔗 Related agreements

- [`excel-import-cells-are-text.md`](excel-import-cells-are-text.md)
- [`../domain/payments-never-guess-paid-state.md`](../domain/payments-never-guess-paid-state.md)
- [`../security/security-guidelines.md`](../security/security-guidelines.md)
