---
name: "licence_must_fit_member"
description: "The server refuses a club admin a licence or title that does not fit the member"
created_at: "2026-11-04T13:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"
---

# A licence must fit the member

## Goal

Which licence fits a member is decided only in the browser, so a club admin with a direct request can pay a cheaper licence for an instructor or create a Shidoin licence for a kyu. The server must refuse it, for club admins only.

## Context

- [`payment-checklist.ts`](../../../frontend/src/features/annual-payments/utils/payment-checklist.ts): `licenceItemOf` and `licenceChoicesOf`, the rule to mirror.
- [`routers/payments.py`](../../../backend/src/infrastructure/web/routers/payments.py): `POST /payments/annual/initiate`, `POST /payments/manual`, where the club admin checks already live.
- [`routers/member_payments.py`](../../../backend/src/infrastructure/web/routers/member_payments.py): `PUT /member-payments/{id}` can change a line's type.
- [`refuse_lines_already_paid.py`](../../../backend/src/application/use_cases/payment/refuse_lines_already_paid.py): the helper shape to follow.
- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`docs/domain/club-admins-manage-their-clubs-payments.md`](../../../docs/domain/club-admins-manage-their-clubs-payments.md).

Decided with the owner on 2026-11-04: a super admin stays free, since the federation names instructors and corrects licences. The Excel import is super admin only and stays out.

Real varieties in production on 2026-11-04, each a test case:

| Licence held | Members | May pay |
|---|---|---|
| none | new members | kyu, kyu_infantil, dan |
| kyu, adult | 588 | kyu, dan |
| kyu, child | 215 | kyu_infantil, dan |
| kyu, age_category child but over 14 by birth date | 1 line paid as kyu | kyu, dan |
| dan | 293 + 5 child | dan |
| shidoin | 53 + 4 child | shidoin |
| fukushidoin | 33 | fukushidoin |
| kyu with shidoin, inconsistent | 13 | shidoin |
| two licences, dan and a title | 5 members hold several | anything either licence allows |

## Phases

### Phase 1: card and manual payments refuse a licence that does not fit

Description: both ways of paying answer 400 to a club admin, before charging or recording anything. Super admins are not checked.

Public contracts:

- Domain: `payable_licence_items(licences, birth_date, today) -> frozenset[str]` in `domain/entities/license.py`.
- Application: `refuse_licences_that_do_not_fit(license_repository, members, lines, today)`, raising `InvalidPaymentDataError`.
- HTTP: `POST /payments/annual/initiate` and `POST /payments/manual` answer 400 to a club admin.
- Copy: `{member} no puede pagar {concepto}: no corresponde a su licencia`.
- Test suites: `test_payable_licence_items.py` with the table above, `test_club_admin_licence_must_fit.py`.

To-do:

- [x] Write the failing tests.
- [x] Add the rule, the helper and the two router checks.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: changing a line's type respects the same rule

Description: `PUT /member-payments/{id}` refuses a club admin a type change to a licence that does not fit. Editing anything else on a line is not checked, so old lines stay editable.

Public contracts:

- HTTP: `PUT /member-payments/{id}` answers 400 to a club admin in that case.
- Test suite: new cases in `test_club_admin_licence_must_fit.py`.

To-do:

- [x] Write the failing tests.
- [x] Add the router check.
- [x] Record the rule in `docs/domain/payment-cycles.md`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Belt checked at the door by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
