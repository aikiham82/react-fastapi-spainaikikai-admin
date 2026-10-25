# 🎯 Validity follows the dates

## 💡 Convention

Whether a licence or an insurance is in force comes from its dates: a licence until its expiration date, an insurance until its end date. The only status an admin sets by hand is the annulment (licence `revoked`, insurance `cancelled`), shown as "Anulada"; "Reactivar" removes it and the dates rule again. To reactivate or expire one, the admin moves its dates.

## 🏆 Benefits

- Decided with the federation on 2026-10-25. Production stores every licence and insurance as `active`, including 683 licences that expired in 2025, so a stored status was never the truth; a free status selector would have let "Activa" sit next to a past date.
- Summaries, paid marks and lists that look at dates never disagree with what the admin chose.

## 👀 Examples

### ✅ Good: move the date, or annul

```python
license.update_dates(None, datetime(2027, 12, 31, 23, 59, 59))  # in force again
license.annul()                                                # withdrawn whatever the dates say
```

### ❌ Bad: a status that contradicts the dates

```python
license.status = LicenseStatus.ACTIVE  # expiration_date is 2025-12-31
```

## 🧐 Real world examples

- [`License.update_dates`, `annul`, `follow_dates`](../../backend/src/domain/entities/license.py)
- [`Insurance.effective_status`](../../backend/src/domain/entities/insurance.py)
- [`AnnulmentPanel.tsx`](../../frontend/src/core/components/AnnulmentPanel.tsx)

## 🔗 Related agreements

- [`payment-cycles.md`](payment-cycles.md)
- [`data-model.md`](data-model.md)
