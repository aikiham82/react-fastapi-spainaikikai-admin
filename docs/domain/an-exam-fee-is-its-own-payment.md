# 🎯 An exam fee is its own payment

## 💡 Convention

A Dan exam fee (tasa de examen) is a payment of type `exam_fee` for **one member and one exam**, never a line inside the annual payment, and paying it **never changes the member's grade or licence**: the grade still moves only when the club pays the new grade's licence or changes the number by hand.

- **Seven exams, seven prices.** The exam is one of `examen_dan_1_hombu`, `examen_dan_1`, `examen_dan_2` … `examen_dan_6` (`EXAM_ORDER` in `member_payment.py`). The key is also the price configuration key, category `exam`. A missing or switched-off price refuses the payment; it is never charged at 0,00 €.
- **1st Dan has two prices, chosen by hand.** With an Aikikai Hombu Dojo registration number it costs less. The platform keeps no such number: whoever pays picks the option, as the old web shop did.
- **Once per member, grade and year.** `exam_charge` refuses an exam the member already paid that calendar year (`refuse_lines_already_paid`), and 1st Dan with and without Hombu number count as the **same** exam. A retake in the same year is registered by the federation by hand.
- **Grade, date and venue travel with it.** They go into the line description, `Examen 2.º Dan · 14/11/2026 · Madrid`, which is the invoice line and the concept shown in the payment lists.
- **Who pays.** A super admin or a club admin, for members of their club, by hand (`POST /payments/exam`) or by card. A member, only for themselves, by card from either card: the Android app (`mobile/`) and the web card (`/card`) are two codebases showing the same card, so a card feature goes into both. Their routes (`POST /payments/exam/initiate`, `GET /payments/exam-prices`) live on the self-service router, outside the admin guard. The Android app cannot post a form, so the backend answers a **signed, 20-minute link** to a public page that posts the Redsys form. The page takes the bank URL from settings, not from the link, and refuses a payment that is no longer pending.
- **Fulfilment** is the shared one: `CompletePaymentUseCase` writes the single exam line, the invoice and the email, and a stuck exam payment can be confirmed by hand like an annual one.

## 🏆 Benefits

- The web shop (WooCommerce) had 37 exam orders in a year, almost all one exam each, paid with a date and venue: a payment per exam matches what clubs already do.
- Paying is not passing. A fee that raised the grade would have to be undone for every failed exam.
- QA paid 1st Dan with and without Hombu number for the same member and both went through before the "same exam" rule. That is a double charge the club would have had to claim back.

## 👀 Examples

### ✅ Good: one exam, its own payment, grade untouched

```python
charge = await exam_charge(member_repository, member_payment_repository, price_repository,
                           member_id, "examen_dan_2", date(2026, 11, 14), "Madrid")
payment = exam_payment(charge, exam_date, payer_name, PaymentMethod.TRANSFER, PaymentStatus.COMPLETED)
```

### ❌ Bad: an exam as an annual item, or a grade change on payment

```python
member_assignments=[ManualMemberAssignment(member_id, name, ["dan", "examen_dan_2"])]  # mixes the season with an exam
licence.change_grade_number(2)  # on payment: a failed exam would leave the member promoted
```

## 🧐 Real world examples

- [`backend/src/application/use_cases/payment/exam_fee.py`](../../backend/src/application/use_cases/payment/exam_fee.py)
- [`backend/src/application/use_cases/payment/initiate_exam_payment_use_case.py`](../../backend/src/application/use_cases/payment/initiate_exam_payment_use_case.py)
- [`backend/src/infrastructure/web/redsys_redirect.py`](../../backend/src/infrastructure/web/redsys_redirect.py)
- [`frontend/src/features/club-payments/components/ExamPaymentModal.tsx`](../../frontend/src/features/club-payments/components/ExamPaymentModal.tsx)
- [`mobile/app/(app)/exam.tsx`](../../mobile/app/(app)/exam.tsx)
- Plan: [`.agents/plans/2026_11_06-exam_fees/`](../../.agents/plans/2026_11_06-exam_fees/2026_11_06-exam_fees-plan.md)

## 🔗 Related agreements

- [`a-payment-is-fulfilled-once.md`](a-payment-is-fulfilled-once.md)
- [`a-club-changes-the-grade-number-not-the-kind.md`](a-club-changes-the-grade-number-not-the-kind.md)
- [`payments-never-guess-paid-state.md`](payments-never-guess-paid-state.md)
- [`the-card-is-for-every-member-the-panel-for-managers.md`](the-card-is-for-every-member-the-panel-for-managers.md)
- [`../security/security-guidelines.md`](../security/security-guidelines.md)
