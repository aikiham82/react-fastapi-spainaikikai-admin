# 🎯 The payments page never guesses what is already paid

## 💡 Convention

The Pagos page offers "Pagar con tarjeta" only when it **knows** what the club has already paid for the selected club and year:

- If the prefill (paid items) or the club's members fail to load, it shows "No hemos podido comprobar lo que ya está pagado" with "Reintentar", and renders no checklist, no total and no pay button.
- Its state is keyed on `club_id:payment_year`: switching club resets the ticks and applies the new club's prefill only once that club's members (not the previous club's placeholder data) are loaded.
- A ticked concept without a configured price blocks payment with a visible message; it is never shown as `0,00 €`.
- The counts sent to the backend (`kyu_count`, `seguro_rc_count`, …) are **derived** from the ticked members (`member_assignments`); the request contract stays the one in [`annual-payment.schema.ts`](../../frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts).

## 🏆 Benefits

- A failed prefill once rendered every member as pending: one click on "Marcar todo lo pendiente" would have charged a club twice.
- A fast club switch could show one club's members under another club and pay for them.
- Deriving counts from the ticked members removes the old double entry (steppers plus a separate assignment table) that could disagree.

## 👀 Examples

### ✅ Good: refuse to offer payment when the paid state is unknown

```tsx
if (hasLoadError) {
  return <EmptyState title="No hemos podido comprobar lo que ya está pagado. Inténtalo de nuevo." action={<Button onClick={retryLoad}>Reintentar</Button>} />
}
```

### ❌ Bad: treat a missing prefill as "nothing paid"

```tsx
const paid = prefill?.paid_assignments ?? []   // a failed request looks like "nothing paid"
```

## 🧐 Real world examples

- [`frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx`](../../frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx)
- [`frontend/src/features/annual-payments/components/PendingPayments.tsx`](../../frontend/src/features/annual-payments/components/PendingPayments.tsx)
- [`frontend/src/features/annual-payments/utils/payment-checklist.ts`](../../frontend/src/features/annual-payments/utils/payment-checklist.ts)

## 🔗 Related agreements

- [`payment-cycles.md`](payment-cycles.md)
- [`invoice-creation.md`](invoice-creation.md)
