# Gestión Manual de Pagos (Admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Full code bodies live in the companion spec docs** (committed alongside this plan):
> - Backend: `.claude/doc/gestion_pagos_admin/backend.md` (sections referenced as B§N)
> - Frontend: `.claude/doc/gestion_pagos_admin/frontend.md` (sections referenced as F§N)
> Each task quotes exact file paths, test code, and commands; for large code bodies it points to the exact spec section to copy verbatim.

**Goal:** Permitir que `super_admin` registre, edite y elimine pagos manualmente (offline/correcciones) a nivel `Payment` y `MemberPayment`, integrado en "Resumen de Pagos".

**Architecture:** Backend hexagonal — nuevo campo `payment_method`, 4 use cases nuevos + cascade en delete, 6 endpoints `require_super_admin`. Frontend feature-based — schemas/services/mutations nuevos + modales integrados en `ClubPaymentDetail`. Un pago manual COMPLETED crea `Payment` + `MemberPayment`s + `Invoice` (mismo path que el webhook Redsys).

**Tech Stack:** FastAPI, Motor (MongoDB), Pydantic, pytest/pytest-asyncio · React 19, TypeScript, React Query, Zod, Radix UI, Vitest.

---

## Pre-flight verification (do FIRST — the plan assumes these exist)

- [ ] **P1: Verify backend repo/service methods assumed by the plan.**

Run from `backend/`:
```bash
grep -n "def find_by_club_id" src/application/ports/member_repository.py
grep -n "def find_by_payment_id\|def create_bulk\|def exists_for_member_year_type\|def find_by_member_ids_year\|def update\b\|def find_by_id" src/application/ports/member_payment_repository.py
grep -n "def find_by_payment_id\|def delete\|def get_next_invoice_number\|def create" src/application/ports/invoice_repository.py
grep -n "def get_invoice_repository\|def get_member_payment_repository\|def get_member_repository\|def get_price_configuration_repository\|def get_pdf_service" src/infrastructure/web/dependencies.py
grep -n "ITEM_TYPE_TO_MEMBER_PAYMENT_TYPE\|PAYMENT_TYPE_TO_PRICE_KEY" src/domain/entities/member_payment.py src/application/use_cases/payment/initiate_annual_payment_use_case.py
```
Expected: each symbol found. **For any MISSING symbol**, add the missing port method + adapter impl as its own sub-task BEFORE the use case that needs it (B§13 shows the pattern for `delete_by_payment_id`). Record gaps in the context session file. Do not proceed to a use case whose dependency is unverified.

- [ ] **P2: Confirm baseline tests pass** (clean worktree).
```bash
cd backend && poetry run pytest -m unit -q
cd ../frontend && npm run test -- --run
```
Expected: green (or record pre-existing failures so new failures are distinguishable).

---

# PHASE 1 — Backend domain foundations

### Task 1: `PaymentMethod` enum + field on `Payment`

**Files:**
- Modify: `backend/src/domain/entities/payment.py` (enum after `PaymentType`; field after `payer_name`; coercion in `__post_init__`)
- Test: `backend/tests/domain/payment/test_payment_entity.py`

- [ ] **Step 1: Write failing tests.** Copy the 5 tests from **B§14.1** into `test_payment_entity.py` (`test_payment_method_defaults_to_redsys`, `_coerces_string_cash`, `_coerces_string_transfer`, `_invalid_raises_invalid_payment_data_error`, `_existing_payment_without_method_gets_redsys_default`). Add imports `PaymentMethod`, `InvalidPaymentDataError`.
- [ ] **Step 2: Run, verify FAIL.** `cd backend && poetry run pytest tests/domain/payment/test_payment_entity.py -k payment_method -v` → FAIL (`ImportError: PaymentMethod`).
- [ ] **Step 3: Implement.** Apply the enum, field, and `__post_init__` coercion block exactly as in **B§1.1**.
- [ ] **Step 4: Run, verify PASS.** Same command → 5 PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(payments): add PaymentMethod enum and field to Payment entity"`

### Task 2: Persist `payment_method` in Mongo adapter (non-destructive)

**Files:**
- Modify: `backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py` (`_to_domain`, `_to_document`)
- Test: existing repository test file (find with `grep -rl "MongoDBPaymentRepository\|mongodb_payment" backend/tests`)

- [ ] **Step 1: Write failing test** asserting round-trip: a doc WITHOUT `payment_method` → entity `.payment_method == PaymentMethod.REDSYS`; an entity with `CASH` → document dict has `"payment_method": "cash"`. (Mirror existing adapter test style; mock collection if used.)
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** the two edits from **B§1.2** (`_to_domain` default `"redsys"`, `_to_document` `payment.payment_method.value`).
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(payments): persist payment_method in mongo adapter with redsys default"`

### Task 3: Fix `Invoice.calculate_totals()` (BLOCKING bug — webhook currently broken)

**Files:**
- Modify: `backend/src/domain/entities/invoice.py` (add public method after `_recalculate_totals`)
- Test: `backend/tests/domain/` invoice test (or create `test_invoice_entity.py`)

- [ ] **Step 1: Write failing test** `test_calculate_totals_sets_tax_total_and_total`: build `Invoice` with one `InvoiceLineItem`, call `invoice.calculate_totals()`, assert `invoice.total` and `invoice.tax_total` are set correctly.
- [ ] **Step 2: Run, verify FAIL** (`AttributeError: calculate_totals`).
- [ ] **Step 3: Implement** the public alias from **B§2**.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `git commit -am "fix(invoice): add public calculate_totals() alias (webhook + manual payment depend on it)"`

### Task 4: Add `MemberPaymentNotFoundError`

**Files:** Modify `backend/src/domain/exceptions/payment.py`

- [ ] **Step 1: Add** the exception from **B§3** (after `DuplicatePaymentForYearError`).
- [ ] **Step 2: Verify import** `python -c "from src.domain.exceptions.payment import MemberPaymentNotFoundError"` from `backend/` (poetry run).
- [ ] **Step 3: Commit.** `git commit -am "feat(payments): add MemberPaymentNotFoundError exception"`

---

# PHASE 2 — Backend use cases (TDD)

> For each use case: write the test file (full code in the referenced B§ test section), run → FAIL, implement the use case (full code in the referenced B§), run → PASS, commit. Tests use `@pytest.mark.unit`/`@pytest.mark.asyncio` with `AsyncMock` repos (fixtures in B§14.2).

### Task 5: `RegisterManualPaymentUseCase`

**Files:**
- Create: `backend/src/application/use_cases/payment/register_manual_payment_use_case.py` (**B§4**)
- Test: `backend/tests/application/use_cases/payment/test_register_manual_payment_use_case.py` (**B§14.2**, 6 tests)

- [ ] **Step 1:** Write test file from B§14.2 (fixtures `mock_repos`, `use_case` + 6 tests).
- [ ] **Step 2:** Run `poetry run pytest tests/application/use_cases/payment/test_register_manual_payment_use_case.py -v` → FAIL (import error).
- [ ] **Step 3:** Implement use case from B§4. **Critical order:** create parent `Payment` first → get real `id` → then build `MemberPayment`s (B§ risk #3). Reuse invoice path; construct `Invoice` with entity fields `tax_total`/`total` only (B§ risk #2). Duplicate check raises `DuplicatePaymentForYearError`.
- [ ] **Step 4:** Run → 6 PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): RegisterManualPaymentUseCase (payment + member payments + invoice)"`

### Task 6: `UpdatePaymentUseCase`

**Files:**
- Create: `backend/src/application/use_cases/payment/update_payment_use_case.py` (**B§5**)
- Test: `backend/tests/application/use_cases/payment/test_update_payment_use_case.py` (**B§14.3**)

- [ ] **Step 1:** Write tests B§14.3 (manual-completed updates; Redsys-completed raises `InvalidPaymentStatusError`; not-found raises `PaymentNotFoundError`). Add a shared `mock_repos`/`use_case` fixture.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement B§5 (Redsys-COMPLETED guard, field updates, `updated_at`).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): UpdatePaymentUseCase with Redsys read-only guard"`

### Task 7: `UpdateMemberPaymentUseCase` (recompute parent amount)

**Files:**
- Create: `backend/src/application/use_cases/payment/update_member_payment_use_case.py` (**B§6**)
- Test: `backend/tests/application/use_cases/payment/test_update_member_payment_use_case.py` (**B§14.4**)

- [ ] **Step 1:** Write tests B§14.4 — key assertion: parent `amount` = sum of COMPLETED lines only (REFUNDED excluded → 105.0). Include `_make_mp` helper. Not-found raises.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement B§6 (`_recompute_parent_amount`).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): UpdateMemberPaymentUseCase recomputing parent amount"`

### Task 8: `DeleteMemberPaymentUseCase`

**Files:**
- Create: `backend/src/application/use_cases/payment/delete_member_payment_use_case.py` (**B§7**)
- Test: `backend/tests/application/use_cases/payment/test_delete_member_payment_use_case.py` (**B§14.6**)

- [ ] **Step 1:** Write tests B§14.6 (delete recomputes parent; not-found raises). Fill the `...` placeholder test body with the recompute assertion mirroring Task 7.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement B§7.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): DeleteMemberPaymentUseCase recomputing parent amount"`

### Task 9: Extend `DeletePaymentUseCase` with cascade + force

**Files:**
- Modify (full rewrite): `backend/src/application/use_cases/payment/delete_payment_use_case.py` (**B§8**)
- Test: `backend/tests/application/use_cases/payment/test_delete_payment_use_case_cascade.py` (**B§14.5**)

- [ ] **Step 1:** Write tests B§14.5 — fill the cascade-order `...` test: assert `mp.delete` per line, then `invoice.delete`, then `payment.delete` (use a shared `call_order` list or `assert_has_calls`). Include force/no-force Redsys cases, manual-no-force success, not-found.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement B§8 (cascade MemberPayments → Invoice (try/except) → Payment; force guard for Redsys COMPLETED).
- [ ] **Step 4:** Run → PASS. Also run any pre-existing delete-payment test to ensure no regression.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): cascade delete (member payments + invoice) with force flag"`

### Task 10: `GetClubMemberPaymentsUseCase`

**Files:**
- Create: `backend/src/application/use_cases/member_payment/get_club_member_payments_use_case.py` (**B§9**)
- Test: `backend/tests/application/use_cases/member_payment/test_get_club_member_payments_use_case.py`

- [ ] **Step 1:** Write tests: empty members → `[]`; members present → calls `find_by_member_ids_year` with member ids and returns its result. (If P1 showed `find_by_member_ids_year` missing, add port+adapter method first — `find({"member_id": {"$in": ids}, "payment_year": year})`.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement B§9.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): GetClubMemberPaymentsUseCase (club -> members -> lines)"`

---

# PHASE 3 — Backend web layer (DTOs, DI, routers)

### Task 11: DTOs

**Files:**
- Create: `backend/src/infrastructure/web/dto/manual_payment_dto.py` (**B§10.1**)
- Modify: `backend/src/infrastructure/web/dto/payment_dto.py` — add `payment_method: str = "redsys"` to `PaymentResponse` (**B§1.3**)
- Modify: `backend/src/infrastructure/web/dto/member_payment_dto.py` — add `MemberPaymentUpdateRequest` (**B§10.2**)
- Modify: `backend/src/infrastructure/web/mappers_payment.py` — add `payment_method=entity.payment_method.value` to `to_response_dto` (**B§1.4**)

- [ ] **Step 1: Write failing test** `backend/tests/infrastructure/web/test_manual_payment_dto.py`: `ManualPaymentRequest` rejects bad `payment_method` ("redsys" not allowed in request → only cash/transfer/other), rejects empty `member_assignments`, rejects `payment_year` out of range; `ManualMemberAssignmentDTO` rejects empty `member_id`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the DTO file + the 3 modifications above.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): manual payment DTOs + payment_method on response"`

### Task 12: DI wiring

**Files:**
- Modify: `backend/src/infrastructure/web/dependencies.py` (**B§12** — replace `get_delete_payment_use_case`, add 5 providers)
- Modify: `backend/src/application/use_cases/__init__.py` (**B§12** — 4 exports + `__all__`)

- [ ] **Step 1:** Apply imports + provider edits from B§12.
- [ ] **Step 2: Verify** `cd backend && poetry run python -c "from src.infrastructure.web import dependencies as d; d.get_register_manual_payment_use_case(); d.get_update_payment_use_case(); d.get_update_member_payment_use_case(); d.get_delete_member_payment_use_case(); d.get_list_club_member_payments_use_case(); d.get_delete_payment_use_case()"` → no error.
- [ ] **Step 3:** Commit. `git commit -am "chore(payments): wire new payment use cases into DI"`

### Task 13: Payment endpoints (POST /manual, PUT /{id}, DELETE /{id} force)

**Files:** Modify `backend/src/infrastructure/web/routers/payments.py` (**B§11.1**)

- [ ] **Step 1: Write failing API test** `backend/tests/api/test_payments_manual_endpoints.py` using the existing API test client + super_admin auth fixture (mirror an existing `tests/api` payment test). Cases: POST `/api/v1/payments/manual` 201; PUT `/{id}` updates manual / 409 on Redsys-completed; DELETE `/{id}` 204; DELETE Redsys-completed without `force` → 409, with `?force=true` → 204; non-super_admin → 403.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement endpoints from B§11.1 (imports, `require_super_admin`, exception→HTTP mapping). Keep route order: `/manual` and `/{payment_id}` use different methods so safe; place new routes before DELETE per B§11.1 note.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(payments): manual payment + update + cascade-delete endpoints (super_admin)"`

### Task 14: Member-payment endpoints (GET club list, PUT, DELETE)

**Files:** Modify `backend/src/infrastructure/web/routers/member_payments.py` (**B§11.2**)

- [ ] **Step 1: Write failing API test** `backend/tests/api/test_member_payments_admin_endpoints.py`: GET `/api/v1/member-payments/club/{id}` returns list; PUT `/{id}` edits line; DELETE `/{id}` 204; existing `/club/{id}/summary` and `/club/{id}/unpaid` STILL work (regression — route-ordering risk B§ risk #7); non-super_admin → 403.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement endpoints from B§11.2. **Declare `GET /club/{club_id}` AFTER `/club/{club_id}/summary` and `/club/{club_id}/unpaid`.**
- [ ] **Step 4:** Run → PASS, incl. the summary/unpaid regression assertions.
- [ ] **Step 5:** Commit. `git commit -am "feat(member-payments): club list + line update/delete endpoints (super_admin)"`

### Task 15: Backend full-suite gate

- [ ] **Step 1:** `cd backend && poetry run pytest --cov=src --cov-report=term-missing -q` → all pass, coverage ≥80% on new modules.
- [ ] **Step 2:** Invoke `backend-test-engineer` subagent (pass context session path) to review test completeness; address gaps.
- [ ] **Step 3:** Commit any added tests. `git commit -am "test(payments): backend coverage for manual payment management"`

---

# PHASE 4 — Frontend data layer (TDD)

### Task 16: Zod schemas

**Files:**
- Create: `frontend/src/features/club-payments/data/schemas/payment-admin.schema.ts` (**F§1**)
- Test: `frontend/src/features/club-payments/data/__tests__/payment-admin.schema.test.ts` (**F§10.5**)

- [ ] **Step 1:** Write schema tests from F§10.5.
- [ ] **Step 2:** `cd frontend && npm run test -- --run payment-admin.schema` → FAIL.
- [ ] **Step 3:** Implement schemas from F§1.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): zod schemas for manual payment admin"`

### Task 17: Service layer

**Files:**
- Create: `frontend/src/features/club-payments/data/services/payment-admin.service.ts` (**F§2**)
- Test: `frontend/src/features/club-payments/data/__tests__/payment-admin.service.test.ts`

- [ ] **Step 1:** Write service tests mocking `@/core/data/apiClient`: assert each fn calls the correct URL/method/params (esp. `deletePayment(id, true)` → `params:{force:true}`; `getClubMemberPayments` → `/member-payments/club/{id}` with `payment_year`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement service from F§2.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): payment admin service (axios)"`

### Task 18: Mutation hooks

**Files:**
- Create dir + file: `frontend/src/features/club-payments/hooks/mutations/usePaymentAdminMutations.ts` (**F§3**)
- Test: `frontend/src/features/club-payments/hooks/__tests__/mutations/usePaymentAdminMutations.test.ts` (**F§10.4**)

- [ ] **Step 1:** Write tests F§10.4 (return shape; success → service+toast.success+`invalidateQueries` with exact keys `['club-payments','club-detail',clubId,year]` & `['club-payments','all-clubs-summary',year]`; error → `toast.error(detail)`; fallback message; delete force true/false). Use `createWrapper` from F§10.2; mock service + `sonner`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the 5 hooks from F§3. Member-payment mutations also invalidate `clubPaymentsKeys.clubMemberPayments(clubId, year)` (added in Task 19).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): payment admin mutation hooks"`

### Task 19: Query hook + key extension

**Files:**
- Modify: `frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts` (**F§4** — add `clubMemberPayments` key + `useClubMemberPaymentsQuery`)
- Test: `frontend/src/features/club-payments/hooks/__tests__/queries/useClubMemberPaymentsQuery.test.ts`

- [ ] **Step 1:** Write test: hook calls `getClubMemberPayments(clubId, year)`, returns data; `enabled=false` when no clubId.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement F§4 (append only — do not rewrite the file).
- [ ] **Step 4:** Run → PASS. Re-run Task 18 mutation tests (member-payment invalidation key now resolvable).
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): useClubMemberPaymentsQuery + key"`

---

# PHASE 5 — Frontend components (consult shadcn-ui-architect for styling)

> Before building each component's JSX/styling, consult **shadcn-ui-architect** (pass context session). Resolve the nested-Dialog decision (F§ risk #1): prefer embedding `MemberSelectionTable` inline with `ScrollArea` (no nested modal). Write behavior tests first per F§10.6.

### Task 20: `ConfirmDeleteDialog`

**Files:** Create `components/ConfirmDeleteDialog.tsx` (**F§5.4**); Test `components/__tests__/ConfirmDeleteDialog.test.tsx` (**F§10.6**)

- [ ] **Step 1:** Tests: `requiresForce=false` confirm enabled; `requiresForce=true` confirm disabled until checkbox; confirm fires `onConfirm`; `isLoading` disables buttons.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement per F§5.4 (`AlertDialog`, force checkbox, destructive button). Get styling from shadcn-ui-architect.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): ConfirmDeleteDialog (force-aware)"`

### Task 21: `MemberPaymentEditModal`

**Files:** Create `components/MemberPaymentEditModal.tsx` (**F§5.3**); Test `components/__tests__/MemberPaymentEditModal.test.tsx`

- [ ] **Step 1:** Tests: not rendered when closed; submit valid → `updateMemberPayment({id,data})`; negative amount → validation error, no service call; close on success.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement F§5.3 (controlled state + `memberPaymentUpdateSchema.safeParse`).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): MemberPaymentEditModal"`

### Task 22: `ManualPaymentModal`

**Files:** Create `components/ManualPaymentModal.tsx` (**F§5.2**); Test `components/__tests__/ManualPaymentModal.test.tsx` (**F§10.6**)

- [ ] **Step 1:** Tests F§10.6 (closed→nothing; open→form; empty payer_name→error, no service; empty member_assignments→error; valid→`registerManualPayment`; cancel→`onClose`; loading members indicator).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement F§5.2; method `Select` excludes 'redsys'; reuse `MemberSelectionTable` (inline per nested-Dialog decision). shadcn-ui-architect for layout.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): ManualPaymentModal"`

### Task 23: `TransactionsSection`

**Files:** Create `components/TransactionsSection.tsx` (**F§5.5**); Test `components/__tests__/TransactionsSection.test.tsx` (**F§10.6**)

- [ ] **Step 1:** Tests: loading skeleton; rows per `MemberPayment`; edit opens `MemberPaymentEditModal`; delete opens `ConfirmDeleteDialog`; Redsys-COMPLETED row edit disabled + delete `requiresForce`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement F§5.5 (query hook, table/cards, row actions, local state). shadcn-ui-architect for table styling.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): TransactionsSection with line edit/delete"`

### Task 24: Integrate into `ClubPaymentDetail` + index exports

**Files:**
- Modify: `components/ClubPaymentDetail.tsx` (**F§6** — imports, state, button, TransactionsSection, modal; destructure `selectedYear`)
- Modify: `index.ts` (**F§9**)
- Test: `components/__tests__/ClubPaymentDetail.admin.test.tsx` (**F§10.6**)

- [ ] **Step 1:** Tests F§10.6 role gating: `isAssociationAdmin()=false` → no button, no TransactionsSection; `=true` → both present; click button opens modal. Mock `usePermissions` per F§10.3.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Apply F§6 edits (gate with `canManagePayments = isAssociationAdmin()`; add `selectedYear` to context destructure) + F§9 exports.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit. `git commit -am "feat(club-payments): integrate manual payment management into ClubPaymentDetail"`

### Task 25: Frontend gate

- [ ] **Step 1:** `cd frontend && npm run lint && npm run test -- --run && npm run build` → all green.
- [ ] **Step 2:** Invoke `frontend-test-engineer` (pass context session) to review coverage; address gaps.
- [ ] **Step 3:** Commit additions. `git commit -am "test(club-payments): frontend coverage for payment admin"`

---

# PHASE 6 — QA validation

### Task 26: End-to-end QA

- [ ] **Step 1:** Start backend (`poetry run uvicorn src.main:app --reload`) + frontend (`npm run dev`) + Mongo.
- [ ] **Step 2:** Invoke `qa-criteria-validator` (Playwright) against the flow: super_admin → Resumen de Pagos → club → Registrar pago manual (efectivo) → verify summary/Total Cobrado updates + invoice created; edit a line → parent recompute; delete a line; attempt edit/delete Redsys-completed → blocked / force path. Confirm club_admin sees NO admin actions.
- [ ] **Step 3:** Iterate on QA feedback until acceptance criteria pass.
- [ ] **Step 4:** Update `.claude/sessions/context_session_gestion_pagos_admin.md` with results.
- [ ] **Step 5:** Commit. `git commit -am "docs(payments): QA validation results for manual payment management"`

---

## Self-review notes (spec coverage)

- Design "facturas siempre" → Task 5 (`_create_invoice`). "payment_method" → Tasks 1–2, 11. "recalcular padre" → Tasks 7–8. "force Redsys" → Tasks 9, 13, 20. "solo super_admin" → Tasks 13–14 (backend), 24 (frontend gating). "integrado en Resumen" → Task 24. Two levels (Payment + MemberPayment) → Tasks 5–9 / 13–14 / 21–23.
- Type consistency: `clubPaymentsKeys.clubDetail/allClubsSummary/clubMemberPayments`, `ManualMemberAssignment` (UC) vs `ManualMemberAssignmentDTO` (web), entity fields `tax_total`/`total` (NOT `tax_amount`/`total_amount`) — verified against specs.
- Known pre-existing bug NOT fully fixed in scope: `MongoDBInvoiceRepository._to_domain` field mismatch (B§ risk #2) — cascade delete wraps invoice lookup in try/except to survive it; flagged to user.
