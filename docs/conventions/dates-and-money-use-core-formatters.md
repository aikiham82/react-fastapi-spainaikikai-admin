# 🎯 Dates and money use the core formatters

## 💡 Convention

Every date and amount shown to a user goes through [`frontend/src/core/utils/format.ts`](../../frontend/src/core/utils/format.ts): `formatDate` (`01/03/2025`), `formatDayMonth` (`01/03`), `formatDateTime` (`16/11/2025, 10:30`) and `formatCurrency` (`1.234,56 €`). They return `-` for empty values, so callers do not write their own ternaries. Never `toFixed(2)` with a hand-written `€`, and never a bare `toLocaleDateString()`.

Date-only strings (`2025-03-01`) are read as local dates, so they never move to the previous day in a negative time zone.

## 🏆 Benefits

- The audit found three money formats on one screen (`221.00€`, `60,00 €`, `100000.00€`); one helper gives one format.
- `es-ES` alone does not group four-digit numbers (`1234,56 €`); the helper forces the thousands separator.
- `1/3/2025` is easy to read as 3 January; `01/03/2025` is not.

## 👀 Examples

### ✅ Good

```tsx
<span>{formatCurrency(totals.total)}</span>
<span>Caduca el {formatDate(license.expiry_date)}</span>
```

### ❌ Bad

```tsx
<span>{totals.total.toFixed(2)}€</span>
<span>{license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('es-ES') : '-'}</span>
```

## 🧐 Real world examples

- [`frontend/src/core/utils/format.ts`](../../frontend/src/core/utils/format.ts) and its tests in [`__tests__/format.test.ts`](../../frontend/src/core/utils/__tests__/format.test.ts)
- [`frontend/src/features/annual-payments/components/PaymentSummary.tsx`](../../frontend/src/features/annual-payments/components/PaymentSummary.tsx)

## 🔗 Related agreements

- [`ui-visual-language.md`](ui-visual-language.md)
