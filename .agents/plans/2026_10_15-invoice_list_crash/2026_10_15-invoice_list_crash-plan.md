---
name: "Invoice list crash"
description: "Make the Facturas page render real invoices and let its status filter use only statuses the backend knows."
created_at: "2026-10-15T09:10:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Invoice list crash

## Goal

The Facturas page crashes as soon as it has an invoice to show, because its status filter renders a Radix `SelectItem` with an empty value. Render the page, keep "Todos" working with the project's `"all"` sentinel, and stop the filter from offering a status ("Anulada"/`void`) the backend rejects with a 500.

## Context

- [`frontend/src/features/invoices/components/InvoiceList.tsx`](../../../frontend/src/features/invoices/components/InvoiceList.tsx): `<SelectItem value="">Todos</SelectItem>` at line 104; `handleFilterStatus` maps the value to `filters.status`.
- [`frontend/src/features/invoices/data/schemas/invoice.schema.ts`](../../../frontend/src/features/invoices/data/schemas/invoice.schema.ts): `InvoiceStatus` includes `void`, labels and variants.
- [`backend/src/domain/entities/invoice.py`](../../../backend/src/domain/entities/invoice.py): `InvoiceStatus` is draft, issued, paid, cancelled.
- [`backend/src/infrastructure/web/routers/invoices.py`](../../../backend/src/infrastructure/web/routers/invoices.py): `GET /invoices?status=` passes the raw string to `GetAllInvoicesUseCase`, which calls `InvoiceStatus(status)`.
- Convention for "Todos": `value="all"` mapped back in `onValueChange`, e.g. [`ImportExportPage.tsx`](../../../frontend/src/features/import-export/components/ImportExportPage.tsx), [`MemberList.tsx`](../../../frontend/src/features/members/components/MemberList.tsx).
- Docs: [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

### Real data variety (production, read-only)

| Case | Production | QA |
|---|---|---|
| status `issued`, no PDF, no due date, `member_id == club_id` | 11 | listed with "Todos" and "Emitida" |
| status `paid` / `cancelled` / `draft` | 0 | filter shows the empty state |
| super admin | all 11 | sees every invoice |
| club admin | own club only | sees only their club's invoices |

## Phases

### Phase 1: The Facturas page renders and its status filter works

Description: "Todos" uses the `"all"` sentinel and sends no status; the status options are the four the backend knows; an unknown `status` query value answers 422.

- [ ] `InvoiceList`: `statusFilter` defaults to `'all'`; "Todos" is `value="all"`; `handleFilterStatus` maps `'all'` to `status: undefined`.
- [ ] Drop `void` from `InvoiceStatus`, `INVOICE_STATUS_LABELS` and `INVOICE_STATUS_VARIANTS`.
- [ ] `GET /invoices` types `status` as the domain `InvoiceStatus`, so an unknown value is a 422.
- [ ] Tests, `frontend/src/features/invoices/components/__tests__/InvoiceList.test.tsx`:
  - [ ] renders an issued invoice without a PDF
  - [ ] "Todos" clears the status filter
  - [ ] "Emitida" filters by `issued`
- [ ] Tests, `backend/tests/api/test_invoices_club_scoping.py`:
  - [ ] `test_an_unknown_invoice_status_is_a_422`
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`, `cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1: the Facturas page renders and its status filter works.

Invoices back on screen, escorted by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
