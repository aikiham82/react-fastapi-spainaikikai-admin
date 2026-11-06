---
name: "exam_fees"
description: "Exam fees (tasas de examen) paid in the platform so the WordPress WooCommerce exam payments can be retired"
created_at: "2026-11-06T18:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "high"

last_implementation_at: "2026-11-06T22:30:00Z"
has_completed_all_phases: true
---

# Exam fees

## Goal

Let club admins and the super admin pay a Dan exam fee for a member, by hand or by card, and let a member pay their own exam from the card app, so the exam payments of the WordPress shop (spainaikikai.org) can be switched off. Paying an exam only charges the fee: it never changes the member's grade or licence.

## Context

- Payable items today: [`member_payment.py`](../../../backend/src/domain/entities/member_payment.py) (`MemberPaymentType`, `ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE`), [`payment.py`](../../../backend/src/domain/entities/payment.py) (`PaymentType`, `CONFIRMABLE_PAYMENT_TYPES`), [`price_configuration.py`](../../../backend/src/domain/entities/price_configuration.py) (`VALID_CATEGORIES`, free-text keys outside `license`).
- Manual path: [`register_manual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/register_manual_payment_use_case.py), [`manual_payment_dto.py`](../../../backend/src/infrastructure/web/dto/manual_payment_dto.py), `POST /payments/manual` in [`payments.py`](../../../backend/src/infrastructure/web/routers/payments.py).
- Card path: the closest one-off fee is the seminar oficialidad (`POST /seminars/{id}/oficialidad/initiate`, `useInitiateSeminarOficialidad.mutation.ts`), completed by [`complete_payment_use_case.py`](../../../backend/src/application/use_cases/payment/complete_payment_use_case.py) from [`process_redsys_webhook_use_case.py`](../../../backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py). The in-flight guard against a double charge lives in [`initiate_annual_payment_use_case.py`](../../../backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py) (`IN_FLIGHT_MINUTES`).
- Frontend: [`ClubPaymentDetail.tsx`](../../../frontend/src/features/club-payments/components/ClubPaymentDetail.tsx), [`ManualPaymentModal.tsx`](../../../frontend/src/features/club-payments/components/ManualPaymentModal.tsx), [`payment-labels.ts`](../../../frontend/src/features/club-payments/utils/payment-labels.ts), [`price-configuration.schema.ts`](../../../frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts) (`PRICE_CONCEPTS`, `PriceCategory`), [`price-icon.ts`](../../../frontend/src/features/price-configurations/utils/price-icon.ts).
- Mobile card app: [`mobile/app/(app)/index.tsx`](../../../mobile/app/(app)/index.tsx), [`api-client.ts`](../../../mobile/src/core/api-client.ts). It has no payment today.
- Docs: [`payment-cycles.md`](../../../docs/domain/payment-cycles.md), [`a-payment-is-fulfilled-once.md`](../../../docs/domain/a-payment-is-fulfilled-once.md), [`payments-never-guess-paid-state.md`](../../../docs/domain/payments-never-guess-paid-state.md), [`invoice-creation.md`](../../../docs/domain/invoice-creation.md), [`money-is-limited-where-it-enters.md`](../../../docs/conventions/money-is-limited-where-it-enters.md), [`the-card-is-for-every-member-the-panel-for-managers.md`](../../../docs/domain/the-card-is-for-every-member-the-panel-for-managers.md), [`ui-visual-language.md`](../../../docs/conventions/ui-visual-language.md) (design before code in Claude Design), [`dates-and-money-use-core-formatters.md`](../../../docs/conventions/dates-and-money-use-core-formatters.md), [`fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md).

Decided with the owner on 2026-11-06: a separate exam payment (one exam per payment), the 1st Dan price chosen by hand (with or without Aikikai Hombu Dojo number, no new member field), grade, exam date and venue asked, no grade change on payment, and the member can pay their own exam from the card app.

Real varieties, from the 37 exam orders of the WordPress shop since 2025-11 (each row is a test case and a QA row):

| Exam item | Price | Orders |
|---|---|---|
| `examen_dan_1` (without Hombu number) | 165 € | 18 |
| `examen_dan_1_hombu` (with Hombu number) | 110 € | 8 |
| `examen_dan_2` | 175 € | 5 |
| `examen_dan_3` | 250 € | 4 |
| `examen_dan_4` | 330 € | 5 |
| `examen_dan_5` | 450 € | 0 |
| `examen_dan_6` | 515 € | 0 |

Payment methods: card (22), transfer (15). Payers: super admin, club admin for a member of their club, the member for themselves. Limits: a member of another club (403), a member paying for someone else (403), a missing exam price (blocks payment, never 0,00 €), a double tap on card (one charge), an exam date in the past, an empty venue. One WordPress order held four exams: in the platform that is four payments.

## Phases

### Phase 1: exam prices and manual exam payment

Super admin sets the seven exam prices; a super admin or club admin registers a paid exam (transfer, cash, other) for a member from the club's payments screen. The payment shows in the member's payment history and produces an invoice line with grade, date and venue.

- [x] Draw the «Pagar examen» dialog and the exam rows of the Precios screen in Claude Design (project "Spain Aikikai admin - rediseño"), on the shared data sheet, before writing UI code.
- [x] Domain: `PaymentType.EXAM_FEE = "exam_fee"` (label «Tasa de examen»); `MemberPaymentType` `examen_dan_1_hombu`, `examen_dan_1`, `examen_dan_2` … `examen_dan_6` with labels «Examen 1er Dan (con nº Hombu)», «Examen 1er Dan (sin nº Hombu)», «Examen 2º Dan» … «Examen 6º Dan»; `EXAM_ITEMS`; price category `exam` whose keys are the exam item types.
- [x] `RegisterManualExamPaymentUseCase.execute(member_id, exam, exam_date, venue, payer_name, payment_method)`: price from the `exam` configuration (missing price → error), a COMPLETED `Payment` of type `EXAM_FEE`, one `MemberPayment` line, an invoice line «Examen 2º Dan · 14/11/2026 · Madrid». No licence or insurance generated.
- [x] `GET /price-configurations/exam-prices` and `POST /payments/exam` (request: member_id, exam, exam_date, venue (1-200 chars), payer_name, payment_method cash|transfer|other). Super admin any member; club admin only members of their club (403 otherwise).
- [x] Test suites: `test_register_manual_exam_payment_use_case.py` (one case per exam item with its price, missing price refused, no licence created, invoice line text), `test_exam_payment_endpoints.py` (super admin, club admin own club, club admin other club 403, plain member 403, unknown exam 422, empty venue 422).
- [x] Frontend: exam concepts in `PRICE_CONCEPTS` and category «Examen»; labels in `payment-labels.ts`; `ExamPaymentModal` («Pagar examen»: «Miembro», «Grado al que se presenta», «Fecha del examen», «Lugar del examen», «Método de pago», «Registrar pago») opened from a «Pagar examen» button in `ClubPaymentDetail`; price shown with `formatCurrency`, payment blocked when the price is missing. Tests for the modal and the mutation.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: card exam payment for admins

The same dialog offers «Pagar con tarjeta», which redirects to Redsys; the bank's confirmation completes the payment through the single fulfilment path.

- [x] `InitiateExamPaymentUseCase.execute(member_id, exam, exam_date, venue, payer_name)`: PENDING `EXAM_FEE` payment with one line, refused while another exam payment for the same member and exam is in flight (`IN_FLIGHT_MINUTES`), returns the Redsys form data.
- [x] `POST /payments/exam/initiate` with the same access rules as phase 1.
- [x] `CompletePaymentUseCase` fulfils `EXAM_FEE`: the `MemberPayment` line, the invoice and the confirmation email; nothing else.
- [x] Test suites: `test_initiate_exam_payment_use_case.py` (happy path, in-flight refusal, another exam for the same member allowed, missing price refused), completion of an exam payment in `test_complete_payment_invoice.py`, endpoint access cases.
- [x] Frontend: «Pagar con tarjeta» in `ExamPaymentModal` using the hidden Redsys form pattern of the seminar oficialidad. Tests.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: a member pays their own exam from the card app

The card app gets a «Pagar examen» button: the member picks grade, date and venue, and the phone's browser opens Redsys.

- [x] Draw the card app «Pagar examen» screen in Claude Design before writing UI code.
- [x] `POST /payments/exam/initiate` also accepts a plain member paying for their own member record (403 for anyone else); the response carries a one-use redirect token.
- [x] `GET /payments/{id}/redsys-redirect?token=…`: public HTML page that auto-submits the Redsys form; refuses an unknown or expired token, a token for another payment, and a payment that is no longer pending. The token is signed and lasts `IN_FLIGHT_MINUTES`; it is not stored as one-use because a finished payment already closes the page and the bank refuses a repeated order.
- [x] Test suites: member pays own exam, member for another member 403, redirect page happy path, wrong token, reused token, completed payment.
- [x] Mobile: «Pagar examen» screen (grade, date, venue, price) and button on the card screen; service call and opening the browser. The card app has no test runner: verified with `tsc` and a one-off check of the date and next-grade helpers.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases done; next, code review, QA, merge, then load the exam prices in production and retire the WordPress shop payments. Mockups: Claude Design project "Spain Aikikai · Tasas de examen", file `Pagar examen.dc.html` (option 1b chosen) and `App carnet - Pagar examen.dc.html`.

Exams graded, fees collected, belts untouched, the first receipt printed, the card swiped: 🧾 💳 📱 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
