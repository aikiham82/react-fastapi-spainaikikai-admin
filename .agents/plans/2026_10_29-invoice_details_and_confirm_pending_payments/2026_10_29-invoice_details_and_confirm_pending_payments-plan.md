---
name: "Invoice details and confirm pending payments"
description: "Invoices carry the Spain Aikikai logo, full customer data and payment details; a super admin confirms an unfinished payment and it is fulfilled like a Redsys one."
created_at: "2026-10-29T12:00:00Z"

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

last_implementation_at: "2026-10-29T15:00:00Z"
has_completed_all_phases: true
---

# Invoice details and confirm pending payments

## 🎯 Goal

Invoice PDFs show the Spain Aikikai logo, the customer's address, email and phone, and the payment date and method. A super admin can confirm an unfinished payment (for example a bank transfer) and the app fulfils it exactly as a successful Redsys payment: lines, licences, insurance, seminar oficialidad, invoice and email.

## 👀 Context

- PDF: [`pdf_service.py`](../../../backend/src/infrastructure/adapters/services/pdf_service.py) (`generate_invoice_pdf`, `save_invoice_pdf`), port [`pdf_service.py`](../../../backend/src/application/ports/pdf_service.py), settings `InvoiceSettings` in [`settings.py`](../../../backend/src/config/settings.py) (`INVOICE_LOGO_PATH`).
- Assets shipped in the image: [`backend/src/infrastructure/assets/`](../../../backend/src/infrastructure/assets/). Logo source: `frontend/public/logo.jpg`.
- Invoice entity: [`invoice.py`](../../../backend/src/domain/entities/invoice.py); adapter [`mongodb_invoice_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_invoice_repository.py).
- Invoice creation (must stay identical, see [`invoice-creation.md`](../../../docs/domain/invoice-creation.md)): `_create_invoice` in [`register_manual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/register_manual_payment_use_case.py) and [`process_redsys_webhook_use_case.py`](../../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py). The webhook reads `member.nombre` / `member.primer_apellido`, which do not exist, so a member Redsys payment silently gets no invoice.
- Completion steps today live inline in the webhook `execute` success branch: `complete_payment`, seminar oficialidad, `_create_member_payments`, `GenerateLicensesAndInsuranceFromPaymentUseCase`, `payment_repository.update`, `_create_invoice`, `_send_confirmation_email`.
- `Payment.complete_payment` only accepts `PROCESSING`. Redsys initiation stores `member_assignments` on the parent payment; `MemberPayment` lines are created only on completion.
- Frontend: Historial club detail [`ClubPaymentDetail.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentDetail.tsx), [`TransactionsSection.tsx`](../../../frontend/src/features/club-payments/components/TransactionsSection.tsx), services in `features/club-payments/data/`, `GET /payments?club_id=` already exists.
- Docs: [`data-model.md`](../../../docs/domain/data-model.md) (naive `utcnow`), [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md), [`pdf-text-is-escaped.md`](../../../docs/security/pdf-text-is-escaped.md), [`roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md), [`production-data-changes.md`](../../../docs/workflow/production-data-changes.md), [`dates-and-money-use-core-formatters.md`](../../../docs/conventions/dates-and-money-use-core-formatters.md).

### Real data matrix (production, read only, 2026-10-29)

| Case | Count | Test / QA row |
|---|---|---|
| Club annual payment, Redsys, completed | 19 | invoice shows club block + "Tarjeta" |
| Club annual payment, no method stored, completed | 33 | "Método de pago" line omitted |
| Club annual payment, cash, completed | 1 | "Efectivo" |
| Seminar oficialidad, completed | 9 | invoice for club, no member lines |
| Annual payment stuck in `processing` with `member_assignments` | 4 | confirm creates lines, licences, invoice |
| Seminar oficialidad stuck in `processing`, no assignments | 2 | confirm marks seminar official + invoice |
| Member (non club) payments | 0 | still covered by a unit test (member customer block) |
| Clubs with address + email, no phone | 33 of 43 | phone line omitted |
| Clubs with address + email + phone | 10 of 43 | all lines |
| Clubs without city | 11 of 43 | address line without city |
| Existing invoices without address/email | 21 of 21 | phase 3 backfill |
| `pending` member payment lines | 0 | not a real case: confirm acts on the parent payment |

## 🪜 Phases

### Phase 1: a complete invoice

Logo, customer block and payment details on every new invoice, built the same way on both payment paths.

- [x] Copy the logo to `backend/src/infrastructure/assets/logo.jpg`; `InvoiceSettings.logo_path` defaults to it when `INVOICE_LOGO_PATH` is unset. Draw it top-left keeping its aspect ratio.
- [x] `Invoice` gains `customer_phone: str = ""`, `payment_date: Optional[datetime] = None`, `payment_method: str = ""`; Mongo adapter reads and writes them.
- [x] New `invoice_customer` module in `application/use_cases/invoice/`: `async build_invoice_customer(payment, member_repository, club_repository) -> InvoiceCustomer(name, email, address, phone)`. Member payment: member data. Club payment: club data. Address line: `address, postal_code city (province)` skipping blanks.
- [x] Both `_create_invoice` use `build_invoice_customer` and fill `payment_date` and `payment_method`. Inject `club_repository` in both use cases (`dependencies.py`). Fixes the `member.nombre` crash.
- [x] PDF customer block: name, address, email, phone, CIF/NIF, each only when present. Details block: "Número de factura", "Fecha de factura", "Fecha de pago", "Método de pago" (redsys "Tarjeta (Redsys)", cash "Efectivo", transfer "Transferencia bancaria", other "Otro"). All text escaped.
- [x] Tests: `test_pdf_service.py` (logo drawn, customer lines, payment details, missing phone omitted); `test_invoice_customer.py` (club, club without phone/city, member); webhook member payment gets an invoice with the member's name; manual payment invoice carries club address and method.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: confirm an unfinished payment

- [x] Extract the webhook success branch into `CompletePaymentUseCase.execute(payment: Payment) -> CompletedPayment(payment, invoice)`. The webhook calls it; behaviour unchanged.
- [x] `ConfirmPaymentReceivedUseCase.execute(payment_id: str, payment_method: str) -> CompletedPayment`: `PaymentNotFoundError` (404), `InvalidPaymentStatusError` unless `pending`/`processing` (409), `InvalidPaymentDataError` for `redsys` or unknown method (400). Sets the method, completes, sends the confirmation email with the invoice.
- [x] `POST /payments/{payment_id}/confirm`, body `ConfirmPaymentRequest{payment_method}`, response `PaymentResponse`, super admin only.
- [x] Frontend: in the Historial club detail, section "Pagos sin terminar" (pending/processing payments of the club, from `GET /payments?club_id=`), each row with amount, date, concept and "Confirmar cobro" (super admin only) opening a dialog with the method select (Transferencia bancaria / Efectivo / Otro) and "Confirmar". Success toast "Cobro confirmado. Se ha emitido la factura."
- [x] Tests: use case (annual processing payment creates lines, licences and invoice; seminar marked official; 409 on completed; 400 on redsys); API guard (club admin 403); webhook tests still green; frontend service, mutation and component tests.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: backfill the existing invoices

- [x] Script in `backend/scripts/` that fills `customer_address`, `customer_email`, `customer_phone`, `payment_date`, `payment_method` of existing invoices from their club/member and payment, with `--dry-run`, and clears `pdf_path` so the PDF is regenerated on download.
- [x] Run following `production-data-changes.md`: backup, dry run, apply, re-read. Done 2026-10-29 before deploy (old code ignores the new fields): 21 of 21 filled, backup `~/backups/spainaikikai/backup-invoice-details-20261029-091325.json`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases done: review, QA and merge.

Invoices dressed for the federation, logo and all, and stuck payments rescued, and the old ones brought up to date, by 🧾 🛟 🗂️ 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
