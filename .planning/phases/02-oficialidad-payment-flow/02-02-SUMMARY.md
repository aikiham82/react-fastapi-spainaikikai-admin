---
phase: 02-oficialidad-payment-flow
plan: "02"
subsystem: payments
tags: [redsys, fastapi, hexagonal-architecture, payments, seminar, webhook]

# Dependency graph
requires:
  - phase: 02-01
    provides: Seminar.is_official field, mark_as_official() method, PaymentType.SEMINAR_OFICIALIDAD, SeminarAlreadyOfficialError, SeminarResponse.is_official DTO field
provides:
  - POST /api/v1/seminars/{seminar_id}/oficialidad/initiate endpoint returning Redsys form data
  - InitiateSeminarOfficialidadUseCase with full Redsys payment flow
  - ProcessRedsysWebhookUseCase SEMINAR_OFICIALIDAD branch with idempotency guard
  - DI factories: get_initiate_seminar_oficialidad_use_case, updated get_process_redsys_webhook_use_case
affects:
  - 02-03-frontend-badge
  - 02-04-frontend-payment-flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Club-level payment (member_id=None, club_id set) for seminar oficialidad
    - Idempotency guard in webhook via is_official check before mark_as_official()
    - SeminarAlreadyOfficialError maps to HTTP 409 in router layer
    - Price fetched from PriceConfiguration with key 'oficialidad_seminar' and category='seminar'

key-files:
  created:
    - backend/src/application/use_cases/seminar/initiate_seminar_oficialidad_use_case.py
  modified:
    - backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py
    - backend/src/infrastructure/web/routers/seminars.py
    - backend/src/infrastructure/web/dependencies.py

key-decisions:
  - "Oficialidad payment is club-level (member_id=None) — the club pays, not an individual member"
  - "Idempotency in webhook via 'if seminar and not seminar.is_official' guard — duplicate webhooks are silently skipped"
  - "SEMINAR_OFICIALIDAD branch in webhook wrapped in try/except — seminar update failure does not fail the payment update"
  - "ok_url and ko_url point to /seminars?oficialidad=ok|cancelled&seminar_id={id}"
  - "Reuses InitiatePaymentResponse DTO — same shape as license payment response, no new DTO needed"
  - "Plan 02-01 executed as prerequisite (domain foundation was not yet applied)"

patterns-established:
  - "Seminar oficialidad endpoint: load seminar → check auth → build URLs from app_settings → call use case → map exceptions to HTTP codes"
  - "Webhook branching: check payment_type before processing type-specific side effects"

requirements-completed: [OFIC-03, OFIC-04, OFIC-08, OFIC-09]

# Metrics
duration: 35min
completed: 2026-02-27
---

# Phase 02 Plan 02: Backend Oficialidad Payment Flow Summary

**Redsys payment flow for seminar oficialidad: POST initiate endpoint creates SEMINAR_OFICIALIDAD payment and returns form data; webhook handler marks seminar official on success with idempotency guard**

## Performance

- **Duration:** 35 min
- **Started:** 2026-02-27T13:40:31Z
- **Completed:** 2026-02-27T14:15:00Z
- **Tasks:** 2 (plus 2 prerequisite tasks from plan 02-01)
- **Files modified:** 11

## Accomplishments
- Created `InitiateSeminarOfficialidadUseCase` — loads seminar, checks is_official (409 if true), fetches price from PriceConfiguration, creates SEMINAR_OFICIALIDAD Payment, generates Redsys form data
- Added `POST /api/v1/seminars/{seminar_id}/oficialidad/initiate` endpoint — auth-gated, maps errors to HTTP 409/400, returns Redsys form fields
- Extended `ProcessRedsysWebhookUseCase` with SEMINAR_OFICIALIDAD branch — calls `mark_as_official()` on success, skips if already official (idempotent)
- Executed plan 02-01 as prerequisite: domain entities (is_official, PaymentType.SEMINAR_OFICIALIDAD, SeminarAlreadyOfficialError), DTO/mapper/repository propagation

## Task Commits

Each task was committed atomically:

1. **Plan 02-01 Task 1+2: Domain foundation** - `23f54ff` (feat)
2. **Task 1: InitiateSeminarOfficialidadUseCase + webhook branch** - `2cf5255` (feat)
3. **Task 2: Router endpoint + DI wiring** - `51b622c` (feat)

## Files Created/Modified
- `backend/src/application/use_cases/seminar/initiate_seminar_oficialidad_use_case.py` — new use case with full Redsys payment initiation flow
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` — added seminar_repository param and SEMINAR_OFICIALIDAD branch
- `backend/src/infrastructure/web/routers/seminars.py` — added POST /{seminar_id}/oficialidad/initiate endpoint
- `backend/src/infrastructure/web/dependencies.py` — added get_initiate_seminar_oficialidad_use_case factory, updated webhook UC factory
- `backend/src/domain/entities/seminar.py` — added is_official field and mark_as_official() method
- `backend/src/domain/entities/payment.py` — added PaymentType.SEMINAR_OFICIALIDAD
- `backend/src/domain/entities/price_configuration.py` — added 'seminar' to VALID_CATEGORIES
- `backend/src/domain/exceptions/seminar.py` — added SeminarAlreadyOfficialError
- `backend/src/infrastructure/web/dto/seminar_dto.py` — added is_official: bool = False to SeminarResponse
- `backend/src/infrastructure/web/mappers_seminar.py` — map is_official in to_response_dto
- `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` — read/write is_official with default False

## Decisions Made
- Oficialidad payment is club-level (member_id=None) — the club pays, not an individual member
- Idempotency via `if seminar and not seminar.is_official` guard in webhook — duplicate Redsys callbacks silently skipped
- SEMINAR_OFICIALIDAD webhook branch wrapped in try/except — seminar update failure logs but does not roll back the payment completion
- ok_url: `/seminars?oficialidad=ok&seminar_id={id}`, ko_url: `/seminars?oficialidad=cancelled&seminar_id={id}`
- Reuses `InitiatePaymentResponse` DTO (same shape as license payments)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Executed plan 02-01 (domain foundation) as prerequisite**
- **Found during:** Pre-execution analysis
- **Issue:** Plan 02-02 depends on `is_official`, `PaymentType.SEMINAR_OFICIALIDAD`, `SeminarAlreadyOfficialError` from plan 02-01, which had not been executed yet
- **Fix:** Executed all plan 02-01 tasks (domain entity changes, DTO/mapper/repository propagation) before beginning plan 02-02 tasks
- **Files modified:** seminar.py, payment.py, price_configuration.py, exceptions/seminar.py, seminar_dto.py, mappers_seminar.py, mongodb_seminar_repository.py
- **Verification:** All domain checks passed via automated verification
- **Committed in:** 23f54ff (prerequisite commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Prerequisite execution was necessary for correctness. No scope creep — executed exactly what plan 02-01 specified.

## Issues Encountered
None — all implementation proceeded as specified in the plan.

## User Setup Required
**MongoDB migration needed before deploying to production:**
```bash
db.seminars.update_many({"is_official": {"$exists": false}}, {"$set": {"is_official": false}})
```
Also create a PriceConfiguration document with `key="oficialidad_seminar"` and `category="seminar"` via the admin UI for the endpoint to return Redsys form data (without it, endpoint returns HTTP 400).

## Next Phase Readiness
- Backend payment flow complete — plan 02-03 (frontend badge) and 02-04 (frontend payment flow) can proceed
- The `is_official` field is now in all API responses, ready for frontend badge display
- POST /api/v1/seminars/{id}/oficialidad/initiate is live and returns Redsys form data

---
*Phase: 02-oficialidad-payment-flow*
*Completed: 2026-02-27*
