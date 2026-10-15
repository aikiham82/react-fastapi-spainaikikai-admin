---
name: "Invoice pending fixes"
description: "Make the Facturas search work, fix the invoice date filter, stop PDF errors leaking internals and replace the exposed pdf_path with has_pdf."
created_at: "2026-10-15T10:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Invoice pending fixes

## Goal

Close the four invoice issues found while fixing the invoice list: the search box filters nothing, `GET /invoices` date filters always return an empty list, PDF failures send the internal exception text to the client, and every invoice response reveals the server path of its PDF.

## Context

- [`frontend/src/features/invoices/components/InvoiceList.tsx`](../../../frontend/src/features/invoices/components/InvoiceList.tsx): `handleSearch` stores the term and filters nothing; download buttons gate on `invoice.pdf_path`.
- [`frontend/src/features/clubs/components/ClubList.tsx`](../../../frontend/src/features/clubs/components/ClubList.tsx): client-side search with `useDebounce` + `useMemo`, the pattern to follow; [`frontend/src/core/hooks/useDebounce.ts`](../../../frontend/src/core/hooks/useDebounce.ts).
- [`backend/src/infrastructure/adapters/repositories/mongodb_invoice_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_invoice_repository.py): `find_by_date_range` compares the stored `issue_date` Date with `date.isoformat()` strings, so nothing matches.
- [`backend/src/infrastructure/web/routers/invoices.py`](../../../backend/src/infrastructure/web/routers/invoices.py): PDF 500s return `detail=str(e)`; `_invoice_to_response` sets `pdf_path`.
- [`backend/src/application/use_cases/invoice/download_invoice_pdf_use_case.py`](../../../backend/src/application/use_cases/invoice/download_invoice_pdf_use_case.py), [`regenerate_invoice_pdf_use_case.py`](../../../backend/src/application/use_cases/invoice/regenerate_invoice_pdf_use_case.py): wrap any exception text into `InvoicePDFGenerationError`.
- Docs: [`docs/domain/data-model.md`](../../../docs/domain/data-model.md) (naive datetimes), [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md).

### Real data variety (production, read-only)

| Case | Production | Test / QA |
|---|---|---|
| status `issued`, no PDF, customer is a club name (may carry accents) | 11 | search by number, by club name without accents, no match |
| invoice number format `YYYY-NNNNNN` | 11 | search "2025-000002" |
| issue_date stored as naive datetime with time of day | 11 | date range including the issue day at both ends |

## Phases

### Phase 1: The Facturas search filters by invoice number or client

Description: client-side, debounced, case- and accent-insensitive search over the loaded invoices.

- [ ] `InvoiceList`: debounce the term with `useDebounce`, filter `invoices` by `invoice_number` and `customer_name` ignoring case and accents.
- [ ] Empty search result shows "No se encontraron facturas para tu búsqueda" with the filter bar still on screen.
- [ ] Tests, `frontend/src/features/invoices/components/__tests__/InvoiceList.test.tsx`:
  - [ ] finds an invoice by its number
  - [ ] finds an invoice by client name typed without accents
  - [ ] shows the no-results message when nothing matches
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd frontend && npm run lint && npm run build && npm run test`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: The invoice date filter returns the invoices in range

Description: `find_by_date_range` queries naive datetime bounds: start day from 00:00, end day included through the end of the day.

- [ ] `MongoDBInvoiceRepository.find_by_date_range` builds `{"issue_date": {"$gte": datetime(start), "$lt": datetime(end) + 1 day}}`.
- [ ] Tests, `backend/tests/infrastructure/adapters/repositories/test_mongodb_invoice_repository.py`:
  - [ ] `test_find_by_date_range_queries_naive_datetime_bounds_including_the_end_day`
  - [ ] `test_find_by_date_range_with_only_an_end_date`
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: PDF errors stay on the server and the response stops exposing the PDF path

Description: PDF 500s log the cause and answer a generic Spanish message; `InvoiceResponse.pdf_path` becomes `has_pdf: bool`, and the frontend gates the download button on it.

- [ ] Router: `logger.exception` on `InvoicePDFGenerationError`, `detail="No se pudo generar el PDF de la factura"` for download and regenerate.
- [ ] `InvoiceResponse`: drop `pdf_path`, add `has_pdf: bool`.
- [ ] Frontend: `Invoice.has_pdf: boolean` replaces `pdf_path`; download buttons use `invoice.has_pdf`.
- [ ] Tests, `backend/tests/api/test_invoices_club_scoping.py`:
  - [ ] `test_a_failed_pdf_does_not_reveal_the_cause`
  - [ ] `test_the_invoice_response_says_whether_a_pdf_exists_without_its_path`
- [ ] Tests, `InvoiceList.test.tsx`:
  - [ ] offers the download when the invoice has a PDF
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification commands. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1: the Facturas search filters by invoice number or client.

Four loose ends, one tidy ledger, by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
