# 🎯 A member counts in a year from their join date

## 💡 Convention

A member belongs to a payment year only if they had joined by then, or if they paid something in that year. Ask the entity with `Member.joined_by(year)`, which reads `registration_date` and falls back to `created_at` when it is missing, and add the members with a completed payment in that year.

`registration_date` ("Fecha de Alta") is editable by super admins and by club admins for their own club. The API stores it naive and accepts it only between 1900 and today, with one day of tolerance past UTC so Spain's today still passes after its midnight.

## 🏆 Benefits

- A member who joined in 2026 is not listed as pending in the 2025 payment summary or prefilled into a 2025 payment.
- A member who joined late but paid for an earlier year still shows in that year with the payment.
- Around 700 members carry no `registration_date` (migration and the 2026-04-17 Excel import); the `created_at` fallback gives each of them a year instead of none.

## 👀 Examples

### ✅ Good: filter by join date, keep the payers

```python
payments = await self.member_payment_repository.find_by_member_ids_year(
    member_ids=member_ids, payment_year=payment_year, status=MemberPaymentStatus.COMPLETED
)
paid_member_ids = {p.member_id for p in payments}
members = [m for m in members if m.joined_by(payment_year) or m.id in paid_member_ids]
```

### ❌ Bad: every active member, whatever the year

```python
members = [m for m in all_members if m.is_active]
total_members = len(members)
```

A 2025 summary then lists members who joined in 2026 as pending.

### ❌ Bad: writing the fallback back as a real date

```tsx
updateMember(member.id, formData) // formData.registration_date was prefilled from created_at
```

Saving any other field would turn the `created_at` fallback into a stored `registration_date`. Send the date only when the user changed it.

## 🧐 Real world examples

- [`backend/src/domain/entities/member.py`](../../backend/src/domain/entities/member.py): `joined_by`.
- [`backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py`](../../backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py)
- [`backend/src/application/use_cases/member_payment/get_all_clubs_payment_summary_use_case.py`](../../backend/src/application/use_cases/member_payment/get_all_clubs_payment_summary_use_case.py)
- [`backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py`](../../backend/src/application/use_cases/payment/prefill_annual_payment_use_case.py)
- [`backend/src/infrastructure/web/dto/member_dto.py`](../../backend/src/infrastructure/web/dto/member_dto.py): `RegistrationDate`.
- [`frontend/src/features/members/components/MemberForm.tsx`](../../frontend/src/features/members/components/MemberForm.tsx): `joinDateOf`.

## 🔗 Related agreements

- [`payment-cycles.md`](payment-cycles.md)
- [`data-model.md`](data-model.md)
- [`roles-and-permissions.md`](roles-and-permissions.md)
