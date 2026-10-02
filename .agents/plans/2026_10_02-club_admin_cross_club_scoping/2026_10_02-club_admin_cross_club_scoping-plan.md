---
name: "Club admin cross-club scoping"
description: "Hold a club admin to their own club on payments, member payments, invoices, licences and the member import."
created_at: "2026-10-02T00:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Club admin cross-club scoping

## 🎯 Goal

A club admin reads and changes only what belongs to their own club. Today the administration API requires an admin, but on several routers any club admin reaches every club's payments, invoices and licences, and can start payments or import members for another club.

## 👀 Context

Confirmed on a local instance: `GET /api/v1/payments` returns the payments of all five clubs to a club admin. The audit below was cross-checked against the code.

- [`backend/src/infrastructure/web/routers/payments.py`](../../../backend/src/infrastructure/web/routers/payments.py): `GET ""`, `GET /annual/prefill`, `GET /{payment_id}`, `GET /{payment_id}/status`, `POST /initiate`, `POST /annual/initiate` and `PUT /{payment_id}/refund` check no club. `Payment` carries `club_id`, which may be null.
- [`backend/src/infrastructure/web/routers/member_payments.py`](../../../backend/src/infrastructure/web/routers/member_payments.py): `GET /member/{member_id}`, `GET /member/{member_id}/history`, `GET /club/{club_id}/summary`, `GET /club/{club_id}/unpaid` and `GET /club/{club_id}` check no club. `MemberPayment` carries only `member_id`.
- [`backend/src/infrastructure/web/routers/invoices.py`](../../../backend/src/infrastructure/web/routers/invoices.py): none of its five handlers checks a club. `Invoice` carries `club_id`; `GetAllInvoicesUseCase.execute` has no club parameter.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py): `GET /{license_id}` checks nothing, and the two self-service routes let a club admin read any member.
- [`backend/src/infrastructure/web/routers/import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): `POST /members/import` takes the club from each row. The other imports and exports are already super admin only.
- [`backend/src/infrastructure/web/authorization.py`](../../../backend/src/infrastructure/web/authorization.py): `AuthContext`, `require_club_admin_ctx`. The same rule is written twice as private helpers, `_require_access_to_club` in `routers/members.py` and `_require_access_to_member` in `routers/insurances.py`.
- Seminars, clubs and the dashboard are already scoped.
- The admin frontend calls these endpoints for the caller's own club, so they must keep working there: `frontend/src/features/annual-payments`, `member-payments`, `invoices`, `licenses`, `import-export`.
- The mobile app calls `GET /licenses/member/{id}` and `GET /licenses/{id}/image` as a plain member. That behaviour must not change.

Decisions taken with the user:

- Refunding a payment becomes super admin only, like registering, editing and deleting a manual payment.
- A record with no club is reachable by a super admin only.

Documentation to follow:

- [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md) and [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md).
- [`docs/domain/payment-cycles.md`](../../../docs/domain/payment-cycles.md).
- [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md) and [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

## 🪜 Phases

### Phase 1: payments and member payments

Money first. One shared rule replaces the private helpers, and every payment endpoint applies it.

Public contracts:

- Authorization: new `require_club_access(ctx, club_id, detail=...)` in `infrastructure/web/authorization.py`. A super admin passes; a club admin passes only when `club_id` is their own; a null club is refused to a club admin.
- Authorization: new `require_member_access(ctx, member_id, member_repository, detail=...)` in the same module, for data that only carries a member.
- HTTP `payments`: `GET ""` and `GET /annual/prefill` use the caller's club for a club admin, whatever `club_id` they send. `GET /{payment_id}` and `GET /{payment_id}/status` answer `403` for a payment of another club or with no club. `POST /initiate` and `POST /annual/initiate` answer `403` for another club. `PUT /{payment_id}/refund` answers `403` unless the caller is a super admin.
- HTTP `member-payments`: `GET /member/{member_id}` and `GET /member/{member_id}/history` answer `403` for a member of another club. `GET /club/{club_id}/summary`, `GET /club/{club_id}/unpaid` and `GET /club/{club_id}` answer `403` for another club.
- Test suite `tests/api/test_payments_club_scoping.py` (new): a club admin lists only their club; is refused a foreign payment, a payment with no club and their status; is refused starting a payment for another club; is refused a refund even in their own club; works on their own club; a super admin works on any club and refunds.
- Test suite `tests/api/test_member_payments_club_scoping.py` (new): a club admin is refused a foreign member's status and history and a foreign club's summary, unpaid list and list; works on their own; a super admin works on any.
- Test suite `tests/infrastructure/web/test_club_access.py` (new): the two helpers, for a super admin, a club admin of the club, a club admin of another club, a null club and an unknown member.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Add `require_club_access` and `require_member_access`, and make the helpers in `routers/members.py` and `routers/insurances.py` call them.
- [ ] Scope the payment handlers and restrict the refund to a super admin.
- [ ] Scope the member payment handlers.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: invoices and licences

Public contracts:

- HTTP `invoices`: `GET ""` returns only the caller's club to a club admin. `GET /member/{member_id}` answers `403` for a member of another club. `GET /{invoice_id}`, `GET /{invoice_id}/pdf` and `POST /{invoice_id}/regenerate-pdf` answer `403` for an invoice of another club or with no club.
- HTTP `licenses`: `GET /{license_id}`, `GET /member/{member_id}` and `GET /{license_id}/image` answer `403` to a club admin for a member of another club. A plain member keeps reading their own licence and no other.
- Test suite `tests/api/test_invoices_club_scoping.py` (new): a club admin lists only their club; is refused a foreign member's invoices, a foreign invoice, its PDF and its regeneration, and an invoice with no club; works on their own; a super admin works on any.
- Test suite `tests/api/test_license_self_service.py` (modified): a club admin reads the licences and the image of a member of their club and is refused another club's; the existing plain member cases stay.
- Test suite `tests/api/test_licenses_club_scoping.py` (new): `GET /licenses/{license_id}` for a club admin on their club, on another club, and for a super admin.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Scope the invoice handlers.
- [ ] Scope the three licence handlers for club admins.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: member import

Public contracts:

- HTTP `POST /import-export/members/import`: for a club admin every imported row lands in their own club; a row naming another club is reported as an error for that row and not imported. A super admin is unchanged.
- Spanish copy, new row error: "No puedes importar miembros en otro club".
- Test suite `tests/api/test_members_import_club_scoping.py` (new): a club admin's row without a club lands in their club; a row naming another club is rejected with the row error and nothing is created for it; a super admin imports into the club named in the row.
- Documentation: `docs/security/security-guidelines.md` names `require_club_access` and `require_member_access` as the one way to scope a club admin.

To-do:

- [ ] Write the failing tests listed above.
- [ ] Force the club on the member import for a club admin and reject rows naming another club.
- [ ] Update the security guidelines.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1, payments and member payments.

Each club keeps to its own tatami: plan laid out by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
