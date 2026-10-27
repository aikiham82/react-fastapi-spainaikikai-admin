# 🎯 A club changes the grade number, not the kind

## 💡 Convention

A member's grade lives on their **licence**, not on the member. A club admin changes only the **number** of a member's kyu or dan (5º Kyu → 4º Kyu) through `PUT /members/{id}/grade`. Moving from kyu to dan and the instructor title (Shidoin, Fukushidoin) change only when the club **pays** that licence in «Pagos» (`generate_licenses_from_payment_use_case.py`); editing them, the age category or the dates by hand stays with the federation (`PUT /licenses/{id}`, super admin only). They form the licence price key `technical_grade-instructor_category-age_category` and the number does not.

A club admin cannot change their own grade or the grade of a deregistered member. Only a licence in force is rewritten.

A member may hold their dan and their title on **two** licences ("5º Dan" and "Shidoin"). The grade comes from the licence holding a grade (`grade_licence_among`), the title from any current licence (`title_among`).

## 🏆 Benefits

- 2026-10-27: club managers could not find where to change kyus, because only the super admin edited licences. Opening the whole licence edit to clubs would have let a club lower its own price.
- One domain rule picks the grade licence, so the licence edited is the one the list shows.
- 5 members in production had their title on a separate licence and the list hid it.

## 👀 Examples

### ✅ Good: a club admin changes the number

```http
PUT /api/v1/members/{member_id}/grade
{"grade_number": 4}
```

### ❌ Bad: a club admin edits the licence

```http
PUT /api/v1/licenses/{license_id}
{"technical_grade": "dan", "instructor_category": "shidoin"}
```

That changes the price without paying it; the club pays the Dan or title licence in «Pagos» instead.

## 🧐 Real world examples

- [`change_member_grade_use_case.py`](../../backend/src/application/use_cases/license/change_member_grade_use_case.py)
- [`license.py`](../../backend/src/domain/entities/license.py): `change_grade_number`, `grade_licence_among`, `title_among`
- [`MemberForm.tsx`](../../frontend/src/features/members/components/MemberForm.tsx): the «Grado» select

## 🔗 Related agreements

- [`roles-and-permissions.md`](roles-and-permissions.md)
- [`a-deregistered-members-licence-is-history.md`](a-deregistered-members-licence-is-history.md)
- [`payment-cycles.md`](payment-cycles.md)
