# Gestión Manual de Pagos (Admin) — QA Acceptance Criteria

**Branch:** `worktree-gestion-pagos-admin`
**Status:** Implementation complete + statically verified. Live Playwright QA pending (needs running stack).

## How to run the stack for QA
```bash
# 1. Mongo (project compose) + seed with demo accounts
docker compose up -d            # from repo root
# 2. Backend (worktree)
cd backend && DATABASE_NAME=spainaikikai poetry run uvicorn src.main:app --reload   # :8000
# 3. Frontend (worktree)
cd frontend && npm run dev      # :5173
```
Login as **super_admin**: `admin@spainaikikai.es` (password in vault `spainaikikai-admin/super`).
Login as **club_admin** for the negative check: `director@aikido-madrid.es` (vault `spainaikikai-admin/club`).

## Acceptance criteria (Playwright)

### AC1 — Visibility / permissions
- super_admin → Resumen de Pagos → open a club → sees **"Registrar pago manual"** button and a **"Transacciones"** section.
- club_admin (same screen, own club) → button and Transacciones section are **NOT** rendered. (Backend also returns 403 if called directly.)

### AC2 — Register manual offline payment
- Click "Registrar pago manual" → modal titled "Registrar pago manual — {club}".
- Method select offers only Efectivo / Transferencia / Otro (NO Redsys).
- Select member(s) + payment type(s), payer name, method=Efectivo, submit.
- Toast "Pago registrado correctamente"; summary "Total Cobrado" and member rows update (queries invalidated).
- An Invoice is generated for the payment (verify in invoices/DB).

### AC3 — Edit a payment line
- In Transacciones, edit a line (amount/concept/type/status) → toast success; parent Payment.amount recalculated = sum of COMPLETED lines; summary reflects it.

### AC4 — Delete a payment line
- Delete a line via confirm dialog → toast success; parent amount recomputed; row gone.

### AC5 — Redsys protection (backend-enforced)
- A Redsys COMPLETED payment cannot be edited (PUT → 409) and cannot be deleted without `force=true` (DELETE → 409; with `?force=true` → 204).
  - Note: line-level (MemberPayment) editing has no payment_method, so the force/lock rule is enforced at the **Payment** transaction level (backend). The current Transacciones UI lists MemberPayment lines; Payment-level lock is verified via API.

### AC6 — Validation
- Empty payer_name or no member assignment → inline error, no API call.
- Duplicate (member+type+year already paid) → 409, error toast.

## Static verification already done
- Backend: app boots, all routes register; new use-case modules 99–100% covered; 645 tests pass (10 pre-existing Spanish/English `*_not_found_error` message-format failures unrelated to this feature).
- Frontend: 454 tests pass; new feature files lint-clean; tsc clean for feature files.

## Known limitations / follow-ups
1. **Transacciones shows `member_id` (UUID), not member name** — `MemberPayment` carries no name; enrich via backend (join member names into `GET /member-payments/club/{id}`) for better UX.
2. **Line-level Redsys lock not shown in UI** — `MemberPayment` lacks `payment_method`; lock is Payment-level (backend-enforced). A future Payment-level transactions table (importe/método/estado/fecha with disabled actions for Redsys) would fully realize the original design's "Transacciones" intent.
3. **Pre-existing bug (out of scope, flagged):** `MongoDBInvoiceRepository._to_domain` maps non-existent fields (`tax_amount/total_amount/paid_date/license_id`) → reading invoices from Mongo can raise `TypeError`. Cascade delete wraps invoice lookup in try/except to survive it, but this adapter bug should be fixed separately.
4. Pre-existing project lint/tsc debt in `test-utils/*` and auth tests (not from this feature).
