---
name: "Remove the payment update endpoint"
description: "PUT /payments/{id} writes any status without fulfilling anything and nothing calls it, so it goes away"
created_at: "2026-11-03T14:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

last_implementation_at: "2026-11-03T15:00:00Z"
has_completed_all_phases: "true"
---

# Remove the payment update endpoint

## Context

`PUT /payments/{id}` lets a super admin or the admin of the payment's club write any status from any status. Setting `completed` creates no member lines, licences, insurance or invoice, which breaks `docs/domain/a-payment-is-fulfilled-once.md`. Setting `completed` on a refunded payment undoes the refund's state. Setting `refunded` stores no refund amount or date. It also edits amount and method with nothing keeping the invoice and lines in step.

No screen, mobile code or script calls it. `useUpdatePaymentMutation` has no consumer since it was written, and Transacciones edits lines through `PUT /member-payments/{id}`. Every status change has its own path: `POST /payments/manual`, `POST /payments/{id}/confirm`, `PUT /payments/{id}/refund` and the Redsys webhook.

The change does not depend on tenant data. Production holds 62 completed, 10 failed, 6 processing and 1 cancelled payments, and none is touched. Processing ones are still confirmed by a super admin with `/confirm`.

## Phase 1: the endpoint is gone

### Public contracts

- HTTP: delete `PUT /api/v1/payments/{payment_id}`. It answers `405`, because `DELETE` lives on the same path.
- Use cases: delete `UpdatePaymentUseCase`.
- DTOs: delete `PaymentUpdateRequest`.
- Frontend: delete `updatePayment` from `payment-admin.service.ts` and `useUpdatePaymentMutation`.
- Test suite `test_club_admin_manages_payments.py`: `the payment cannot be edited through the API, whoever asks`.

### To do

- [x] Write the failing test: `PUT /payments/{id}` answers `405` for a club admin and a super admin.
- [x] Delete the route, use case, DTO, frontend service function and hook, with the tests that only covered them.
- [x] Update `docs/domain/club-admins-manage-their-clubs-payments.md`.
- [x] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [x] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

## Next step

All phases are complete.

Less code to guard thanks to [Codely](https://codely.com) AI tooling. 🗑️ 🐢
