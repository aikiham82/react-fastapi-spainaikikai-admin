---
phase: 02-oficialidad-payment-flow
verified: 2026-02-27T15:30:00Z
status: human_needed
score: 9/9 automated truths verified
human_verification:
  - test: "Club admin sees 'Solicitar Oficialidad' button on a non-official seminar belonging to their club"
    expected: "Button appears in the detail dialog for a seminar where !is_official, status !== 'cancelled', userRole === 'club_admin', seminar.club_id === clubId"
    why_human: "Requires authenticated session as club admin with a linked seminar — cannot verify conditional rendering logic at runtime without running the app"
  - test: "Clicking 'Solicitar Oficialidad' opens modal, shows price, and redirects to Redsys"
    expected: "SolicitudOficialidadModal opens with the correct price fetched from PriceConfiguration key 'oficialidad_seminar'. Confirm button submits hidden Redsys form and browser navigates away."
    why_human: "Full E2E flow requires Redsys sandbox, a price configuration record in MongoDB, and a real browser session"
  - test: "After Redsys return with ?oficialidad=ok, page shows polling state and eventually 'Seminario oficial!' toast"
    expected: "The page detects the query param on mount, starts 2s polling against GET /api/v1/seminars/{id}, and when is_official becomes true shows toast.success and updates the list"
    why_human: "Requires Redsys webhook to fire and mark seminar official in MongoDB; polling behavior is real-time and cannot be verified statically"
  - test: "After Redsys return with ?oficialidad=cancelled, neutral 'Pago cancelado' toast appears"
    expected: "toast.info('Pago cancelado') is displayed, URL params are cleaned"
    why_human: "Requires browser navigation with query params set; runtime behavior"
  - test: "HTTP 409 returned for already-official seminar and propagated to modal as inline error"
    expected: "POST /api/v1/seminars/{id}/oficialidad/initiate returns 409 with 'Este seminario ya es oficial'; SolicitudOficialidadModal displays this inside the role=alert div, no toast"
    why_human: "Requires an official seminar in the database and an authenticated session to trigger the flow"
  - test: "OfficialBadge (gold pill) appears on official seminar cards in the list and in the detail dialog image"
    expected: "Amber-500 pill with Award icon and 'Oficial' text overlays top-right corner of card and detail dialog images for seminars where is_official=true"
    why_human: "Visual rendering requires browser; badge is conditionally rendered and depends on data from the API"
  - test: "Super admin can create a price configuration with category 'Seminario' and key 'oficialidad_seminar'"
    expected: "PriceConfigurationForm shows 'Seminario' in the category dropdown; submitting creates a PriceConfiguration that the backend accepts (VALID_CATEGORIES includes 'seminar')"
    why_human: "UI interaction with form and backend round-trip; requires authenticated super admin session"
---

# Phase 02: Oficialidad Payment Flow — Verification Report

**Phase Goal:** Club admins can pay via Redsys to have their seminar endorsed by Spain Aikikai, and after confirmed payment the seminar is automatically marked official with no manual approval required.
**Verified:** 2026-02-27T15:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Super admin can set oficialidad price from Price Configurations panel | VERIFIED | `PriceCategory` type includes `'seminar'`; `PRICE_CATEGORY_LABELS` has `seminar: 'Seminario'`; `PriceConfigurationForm` Zod enum is `z.enum(['license', 'insurance', 'club_fee', 'seminar'])`; backend `VALID_CATEGORIES = {"license", "insurance", "club_fee", "seminar"}` |
| 2 | Club admin sees "Solicitar Oficialidad" button on non-official seminar detail | VERIFIED (wiring) | `SeminarList.tsx` lines 416-442: button rendered when `!seminar.is_official && seminar.status !== 'cancelled' && userRole === 'club_admin' && seminar.club_id === clubId`; HUMAN check needed for runtime |
| 3 | Clicking button shows price and redirects to Redsys | VERIFIED (wiring) | `SolicitudOficialidadModal` shows price from `/api/v1/price-configurations` filtered by `key === 'oficialidad_seminar'`; `useInitiateSeminarOfficialidadMutation` creates hidden form and submits to `response.payment_url`; HUMAN check for E2E flow |
| 4 | After successful payment, seminar is automatically marked official | VERIFIED (wiring) | Webhook use case: `if payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD and seminar and not seminar.is_official: seminar.mark_as_official(); await seminar_repository.update(seminar)` — idempotency guard present; HUMAN check for real webhook |
| 5 | Spain Aikikai badge appears in seminar card list and detail for official seminars | VERIFIED (wiring) | `SeminarList.tsx` line 234: `{seminar.is_official && <OfficialBadge />}` in card image; lines 323-329: badge in detail dialog image; HUMAN check for visual rendering |
| 6 | HTTP 409 for already-official seminar | VERIFIED | `initiate_seminar_oficialidad_use_case.py` raises `SeminarAlreadyOfficialError` when `seminar.is_official` is true; router maps it to `HTTP_409_CONFLICT` with `detail="Este seminario ya es oficial"` |
| 7 | Duplicate Redsys webhook is idempotent | VERIFIED | Webhook handler guard: `if seminar and not seminar.is_official:` before calling `mark_as_official()` — second webhook on already-official seminar skips the update silently |
| 8 | "Solicitar Oficialidad" button absent when seminar is already official | VERIFIED | Condition `!seminar.is_official` at line 416 of `SeminarList.tsx` ensures button is not rendered for official seminars |
| 9 | Redsys ok_url and ko_url point to correct frontend paths | VERIFIED | Router builds: `f"{frontend_url}/seminars?oficialidad=ok&seminar_id={seminar_id}"` and `f"{frontend_url}/seminars?oficialidad=cancelled&seminar_id={seminar_id}"` |

**Score:** 9/9 truths verified (automated evidence found for all; 7 also need human runtime confirmation)

---

### Required Artifacts

#### Plan 02-01 — Backend Domain Foundation

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/domain/entities/seminar.py` | `is_official: bool = False` + `mark_as_official()` | VERIFIED | Line 37: `is_official: bool = False`; Lines 104-109: `mark_as_official()` with idempotency guard |
| `backend/src/domain/entities/payment.py` | `PaymentType.SEMINAR_OFICIALIDAD` | VERIFIED | Line 24: `SEMINAR_OFICIALIDAD = "seminar_oficialidad"` |
| `backend/src/domain/entities/price_configuration.py` | `VALID_CATEGORIES` includes `"seminar"` | VERIFIED | Line 34: `VALID_CATEGORIES = {"license", "insurance", "club_fee", "seminar"}` |
| `backend/src/domain/exceptions/seminar.py` | `SeminarAlreadyOfficialError` with `seminar_id` attribute | VERIFIED | Lines 43-48: class exists, inherits `BusinessRuleViolationError`, stores `self.seminar_id` |
| `backend/src/infrastructure/web/dto/seminar_dto.py` | `SeminarResponse.is_official: bool = False` | VERIFIED | Line 54: `is_official: bool = False` in `SeminarResponse` |
| `backend/src/infrastructure/web/mappers_seminar.py` | Maps `is_official` in `to_response_dto` | VERIFIED | Line 56: `is_official=entity.is_official` in `SeminarResponse(...)` constructor |
| `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` | Reads/writes `is_official` with default `False` | VERIFIED | `_to_domain` line 42: `is_official=doc.get("is_official", False)`; `_to_document` line 63: `"is_official": seminar.is_official` |

#### Plan 02-02 — Backend Payment Flow

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/application/use_cases/seminar/initiate_seminar_oficialidad_use_case.py` | Full use case with seminar check, price fetch, Payment creation, Redsys form | VERIFIED | 136 lines; checks `is_official` (raises `SeminarAlreadyOfficialError`), fetches price by key `"oficialidad_seminar"`, creates `SEMINAR_OFICIALIDAD` payment, generates Redsys form data |
| `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` | `SEMINAR_OFICIALIDAD` branch with idempotency guard | VERIFIED | Lines 134-153: branch present, guarded by `not seminar.is_official`, wrapped in `try/except` |
| `backend/src/infrastructure/web/routers/seminars.py` | `POST /{seminar_id}/oficialidad/initiate` endpoint | VERIFIED | Lines 255-302: endpoint exists, auth-gated, maps `SeminarAlreadyOfficialError` to HTTP 409 and `ValueError` to HTTP 400 |
| `backend/src/infrastructure/web/dependencies.py` | `get_initiate_seminar_oficialidad_use_case` factory + webhook UC updated | VERIFIED | Line 302: factory exists with `@lru_cache()`; line 390: `seminar_repository=get_seminar_repository()` injected into webhook UC |

#### Plan 02-03 — Frontend Badge + Price Config

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/features/seminars/data/schemas/seminar.schema.ts` | `is_official: boolean` (required) in `Seminar` interface | VERIFIED | Line 21: `is_official: boolean;` — non-optional |
| `frontend/src/features/seminars/components/OfficialBadge.tsx` | Gold pill, `absolute top-2 right-2 z-10`, `aria-label`, `Award` icon | VERIFIED | Exact implementation matches spec: `bg-amber-500 text-white`, `absolute top-2 right-2 z-10`, `aria-label="Seminario oficial Spain Aikikai"`, `Award className="w-3 h-3"` |
| `frontend/src/features/seminars/components/SeminarList.tsx` | Badge in card image (relative parent) and detail dialog image; chip in info section | VERIFIED | Line 233: `<div className="aspect-video bg-muted relative">`; line 234: `{seminar.is_official && <OfficialBadge />}`; line 322: dialog image with `relative`; lines 404-413: "Seminario avalado por Spain Aikikai" chip |
| `frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts` | `PriceCategory` includes `'seminar'`; `PRICE_CATEGORY_LABELS` has `seminar: 'Seminario'` | VERIFIED | Line 4: union includes `'seminar'`; lines 61-66: `seminar: 'Seminario'` in labels |
| `frontend/src/features/price-configurations/components/PriceConfigurationForm.tsx` | Zod enum includes `'seminar'` | VERIFIED | Line 36: `z.enum(['license', 'insurance', 'club_fee', 'seminar'])` |

#### Plan 02-04 — Frontend Payment Flow

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/features/seminars/data/services/seminar.service.ts` | `initiateSeminarOficialidad` function + export | VERIFIED | Lines 60-64: function POSTs to `${BASE_URL}/${seminarId}/oficialidad/initiate`; line 75: included in `seminarService` object |
| `frontend/src/features/seminars/hooks/mutations/useInitiateSeminarOficialidad.mutation.ts` | Mutation submits Redsys hidden form on success; no toast on error | VERIFIED | Creates hidden form with `Ds_SignatureVersion`, `Ds_MerchantParameters`, `Ds_Signature`; no `onError` handler in mutation config |
| `frontend/src/features/seminars/components/SolicitudOficialidadModal.tsx` | Dialog with price display, spinner confirm, inline `role="alert"` error | VERIFIED | Price shown in amber box; `Loader2` spinner in confirm button; error div has `role="alert"` and `aria-live="polite"` |
| `frontend/src/features/seminars/components/SeminarList.tsx` | "Solicitar Oficialidad" button, post-payment return handling, polling | VERIFIED | Button at lines 416-442 with correct guards; `useEffect` on mount reads `?oficialidad` params; polling every 2s, timeout at 30s; `toast.success('Seminario oficial!')` and `toast.info('Pago cancelado')` |

---

### Key Link Verification

#### Plan 02-01 Key Links

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `mongodb_seminar_repository.py` | `seminar.py` | `doc.get('is_official', False)` | WIRED | Line 42 in `_to_domain`; line 63 in `_to_document` |
| `mappers_seminar.py` | `seminar_dto.py` | `is_official=entity.is_official` | WIRED | Line 56 of `to_response_dto` |

#### Plan 02-02 Key Links

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `seminars.py` (router) | `initiate_seminar_oficialidad_use_case.py` | `Depends(get_initiate_seminar_oficialidad_use_case)` | WIRED | Line 259 in router `initiate_seminar_oficialidad` endpoint |
| `process_redsys_webhook_use_case.py` | `seminar.py` | `seminar.mark_as_official()` | WIRED | Line 145: `seminar.mark_as_official()` called in SEMINAR_OFICIALIDAD branch |
| `dependencies.py` | `initiate_seminar_oficialidad_use_case.py` | `@lru_cache()` factory | WIRED | Line 302: `get_initiate_seminar_oficialidad_use_case()` with all 4 dependencies; line 390: `seminar_repository=get_seminar_repository()` in webhook UC |

#### Plan 02-03 Key Links

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `SeminarList.tsx` | `OfficialBadge.tsx` | `import { OfficialBadge } from './OfficialBadge'` | WIRED | Line 12 import confirmed; used at lines 234, 323, 333 |

#### Plan 02-04 Key Links

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `SolicitudOficialidadModal.tsx` | `useInitiateSeminarOficialidad.mutation.ts` | `useInitiateSeminarOfficialidadMutation()` | WIRED | Line 11 import; line 29: `const mutation = useInitiateSeminarOfficialidadMutation()` |
| `useInitiateSeminarOficialidad.mutation.ts` | `seminar.service.ts` | `seminarService.initiateSeminarOficialidad` | WIRED | Line 2 import; line 17: `mutationFn: (seminarId) => seminarService.initiateSeminarOficialidad(seminarId)` |
| `SeminarList.tsx` | `SolicitudOficialidadModal.tsx` | `import { SolicitudOficialidadModal }` | WIRED | Line 16 import; lines 521-527: modal rendered at bottom of component |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OFIC-01 | 02-01, 02-03 | Super admin configura precio de oficialidad desde Price Configurations | SATISFIED | Backend `VALID_CATEGORIES` includes `"seminar"`; frontend `PriceCategory` includes `'seminar'`; form Zod enum updated |
| OFIC-02 | 02-03, 02-04 | Club admin ve botón "Solicitar Oficialidad" en seminar no oficial propio | SATISFIED (code) | Button in `SeminarList.tsx` with correct 4-condition guard; HUMAN check needed for runtime |
| OFIC-03 | 02-02, 02-04 | Club admin puede iniciar pago vía Redsys | SATISFIED (code) | `POST /{id}/oficialidad/initiate` endpoint exists and returns Redsys form data; mutation submits hidden form; HUMAN check needed |
| OFIC-04 | 02-02 | Tras pago exitoso, seminario queda marcado oficial automáticamente | SATISFIED (code) | Webhook handler SEMINAR_OFICIALIDAD branch calls `mark_as_official()` and `seminar_repository.update()`; HUMAN check needed |
| OFIC-05 | 02-03, 02-04 | Seminarios oficiales muestran badge en tarjeta del listado | SATISFIED (code) | `{seminar.is_official && <OfficialBadge />}` in card image container; HUMAN check for visual |
| OFIC-06 | 02-03, 02-04 | Seminarios oficiales muestran badge en detalle | SATISFIED (code) | Badge in detail dialog image + "Seminario avalado por Spain Aikikai" chip; HUMAN check for visual |
| OFIC-07 | 02-03, 02-04 | Si ya oficial, botón no visible ni accesible | SATISFIED | `!seminar.is_official` gate prevents button render for official seminars |
| OFIC-08 | 02-02 | Endpoint devuelve 409 si seminario ya oficial | SATISFIED | Use case raises `SeminarAlreadyOfficialError`; router maps to HTTP 409 |
| OFIC-09 | 02-02 | Webhook Redsys idempotente | SATISFIED | `if seminar and not seminar.is_official:` guard in webhook handler; duplicate webhook skips update |

**Coverage:** 9/9 requirements claimed — all accounted for. REQUIREMENTS.md shows OFIC-04, OFIC-08, OFIC-09 as "Pending" ([ ]) which was the pre-implementation state; the code now implements all three.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `process_redsys_webhook_use_case.py` | 352 | `TODO: Get retry URL from configuration` | Info | In `_send_failure_email` — pre-existing comment unrelated to Phase 2 scope; does not affect oficialidad flow |

No stub implementations, no placeholder returns, no empty handlers found in Phase 2 files. All `TODO` found is pre-existing (in `_send_failure_email`, not in the SEMINAR_OFICIALIDAD branch).

---

### Human Verification Required

#### 1. "Solicitar Oficialidad" button visibility for club admin

**Test:** Log in as a club admin (`director@aikido-madrid.es` / `demo123`). Navigate to Seminarios. Find a seminar belonging to the admin's club that is NOT official. Click "Ver Detalles". Confirm the "Solicitar Oficialidad" button appears.
**Expected:** Button with Award icon and text "Solicitar Oficialidad" is visible in the detail dialog.
**Also check:** Open detail of an already-official seminar — button must NOT appear.
**Why human:** Requires authenticated session, live data, and runtime rendering.

#### 2. Redsys redirect flow (price display + form submission)

**Test:** Click "Solicitar Oficialidad". Confirm the modal opens showing the configured price from key `oficialidad_seminar`. Click "Confirmar pago".
**Expected:** Modal shows price in amber box; confirm button shows spinner; browser navigates to Redsys payment page.
**Prerequisites:** A `PriceConfiguration` with `key="oficialidad_seminar"` and `category="seminar"` must exist in the database.
**Why human:** Requires Redsys sandbox credentials, database state, and browser navigation.

#### 3. Post-payment return — successful payment polling

**Test:** Complete a successful Redsys sandbox payment for oficialidad. After Redsys redirects back to `/seminars?oficialidad=ok&seminar_id={id}`, observe the page behaviour.
**Expected:** URL params are cleaned; the seminar detail (if opened) shows "Procesando pago..." disabled button; within 30 seconds a `toast.success('Seminario oficial!')` appears and the gold badge becomes visible on the seminar card.
**Why human:** Requires Redsys webhook delivery to backend, MongoDB update, and browser polling.

#### 4. Post-payment return — cancelled payment

**Test:** Start a Redsys payment then cancel it. Observe the page when redirected back to `/seminars?oficialidad=cancelled&seminar_id={id}`.
**Expected:** A neutral info toast "Pago cancelado" appears; URL params are cleaned; seminar remains non-official.
**Why human:** Runtime behaviour dependent on Redsys cancel flow.

#### 5. HTTP 409 displayed in modal (no toast)

**Test:** Somehow trigger the oficialidad initiation for an already-official seminar (e.g. via direct API call, mark a seminar official manually, then use the frontend before cache refreshes). Confirm the modal shows the error inline.
**Expected:** Error message "Este seminario ya es oficial" appears inside the modal in the red `role="alert"` div, NOT as a toast notification.
**Why human:** Requires controlled database state and timing; visual behaviour validation.

#### 6. OfficialBadge visual rendering

**Test:** Mark a seminar as official (via MongoDB directly or after a successful payment). Reload the seminars list.
**Expected:** Gold amber pill with Award icon overlays the top-right corner of the seminar card image and the detail dialog image. If no cover image, badge appears in the fallback container in the detail dialog.
**Why human:** Visual rendering; CSS positioning depends on browser layout.

#### 7. Super admin creates "Seminario" price configuration

**Test:** Log in as super admin (`admin@spainaikikai.es` / `admin123`). Navigate to Configuracion de Precios. Click "Nueva Configuracion de Precio". Select "Seminario" from the Categoria dropdown. Enter key `oficialidad_seminar` and a price (e.g. 50). Save.
**Expected:** "Seminario" option appears in the dropdown; form submits successfully; the configuration is saved and appears in the list.
**Why human:** UI interaction and backend round-trip.

---

### Gaps Summary

No gaps found. All 9 automated must-have truths are verified by direct code inspection. All 9 requirement IDs are implemented. All key links are wired. No stub or placeholder implementations detected in Phase 2 files. All 7 commits documented in summaries exist in git history.

The 7 human verification items are runtime/visual checks that cannot be verified by static code analysis — they confirm the code that exists actually works end-to-end against Redsys and MongoDB.

---

_Verified: 2026-02-27T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
