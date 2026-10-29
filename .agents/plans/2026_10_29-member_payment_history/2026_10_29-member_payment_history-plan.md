---
name: "2026_10_29-member_payment_history"
description: "A member's payment lines show when and how they were paid, grouped by year, and open from Miembros and from Licencias."
created_at: "2026-10-29T09:00:00Z"

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

last_implementation_at: "2026-10-29T10:40:00Z"
has_completed_all_phases: true
---

# Member payment history

## 🎯 Goal

The super admin opens a member's payments from Miembros or from Licencias and sees every line grouped by year, newest first, with concept, amount, status, payment date and method, and can still edit, delete or add lines. Before a dan exam they check several years at a glance.

## 👀 Context

- Dialog today: "Ver pagos" in [`MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx) renders `MemberPaymentStatus` + [`MemberPaymentLines.tsx`](../../../frontend/src/features/club-payments/components/MemberPaymentLines.tsx) (edit/delete/add already exist, super admin only).
- History endpoint: `GET /member-payments/member/{id}/history` in [`member_payments.py`](../../../backend/src/infrastructure/web/routers/member_payments.py), use case [`get_member_payment_history_use_case.py`](../../../backend/src/application/use_cases/member_payment/get_member_payment_history_use_case.py).
- Every `member_payments.payment_id` resolves to a `transactions` document carrying `payment_date` and, except Excel imports, `payment_method`. No new collection field is needed.
- Out of scope: years before 2025 (no data; needs an import of the client's old spreadsheets) and a full member page.

### Real data variety (production, read-only, 2026-10-29)

| Line source | Count | payment_date | payment_method |
|---|---|---|---|
| Early Redsys, before the method field (2026) | 926 | set | missing, read as `redsys` by the domain default |
| Redsys (2025–2027) | 177 | set | `redsys` |
| Manual payment | 1 | set | `cash` |
| Transaction without date | 0 lines today (12 transactions) | null | any |

Members: 460 with one year, 67 with two, 1 with three. Cases: member with no lines; member with lines in several years.

## 🪜 Phases

### Phase 1: Payment date and method on each line

Contracts:
- HTTP `GET /member-payments/member/{id}/history`: each item of `payments` adds `paid_at: datetime | null` and `payment_method: str | null` (additive).
- Use case `GetMemberPaymentHistoryUseCase` gets `PaymentRepositoryPort`; `MemberPaymentHistoryResult` gains `payment_by_id: Dict[str, Payment]`.
- Zod `memberPaymentSchema` adds optional `paid_at` and `payment_method`.
- Copy: "Pagado el {fecha} · {método}" with the existing `PAYMENT_METHOD_LABELS`; no date → "Sin fecha de pago".
- Tests: `backend/tests/api/test_member_payment_history_paid_at.py` (redsys, manual cash, undated transaction, missing transaction); `MemberPaymentLines.test.tsx` shows date and method.

- [x] Test first, then use case + router + DTO.
- [x] Zod schema, line shows date and method.
- [x] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [x] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

### Phase 2: One payments dialog, grouped by year, from Miembros and Licencias

Contracts:
- Component `MemberPaymentsDialog({ memberId, memberName, onClose })` in `features/member-payments/components/`, loads the member for name and club.
- `MemberPaymentLines` groups lines by year, newest first, with a year heading and the year's paid total.
- Licencias row menu adds "Ver pagos".
- Tests: `MemberPaymentLines.test.tsx` groups by year newest first; `LicenseList` test opens "Ver pagos".

- [x] Grouping by year.
- [x] Dialog extracted and used by MemberList and LicenseList.
- [x] Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
- [x] STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.
