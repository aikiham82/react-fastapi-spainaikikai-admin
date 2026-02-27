# Project Research Summary

**Project:** Spain Aikikai Admin — Seminar Cover Image Upload + Oficialidad Payment
**Domain:** Brownfield backoffice extension — file upload + new Redsys payment type
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

This is a brownfield extension of an existing FastAPI + React backoffice system, not a greenfield project. The system already runs a complete Redsys payment integration, a working seminar CRUD feature, and has Pillow and python-multipart already installed. Both new features — seminar cover image upload and the oficialidad payment flow — slot directly into these existing foundations with zero new infrastructure dependencies. The recommended approach is surgical: extend the `Seminar` domain entity with two fields (`cover_image_url`, `is_official`), add a new `PaymentType` enum value, create one new use case for image upload, and extend the existing webhook use case with a new branch for the oficialidad payment type.

The most important architectural decision is to keep the two features loosely coupled but sequence them correctly: the domain entity changes must come first since they are the shared foundation for both features, and the oficialidad webhook extension must be built with idempotency from the start — an existing known gap in the codebase that becomes critical once the new payment type triggers seminar state changes. The cover image and oficialidad flows are otherwise independent and can be developed in parallel after the domain layer is established.

The top risks are security-related (MIME type spoofing on file upload, path traversal via filename) and correctness-related (duplicate webhook delivery causing double state changes). All risks are preventable with standard patterns already used elsewhere in the codebase. No risks require architectural changes — only disciplined implementation of validation and idempotency guards that the research has explicitly identified and documented.

---

## Key Findings

### Recommended Stack

The project already contains every dependency needed. No new packages are required beyond potentially checking for `aiofiles` (transitive dependency of FastAPI's StaticFiles). The approach is pure extension: `FastAPI.UploadFile` for multipart file reception, `fastapi.staticfiles.StaticFiles` for serving uploaded images (one `app.mount()` call in `app.py`), `Pillow` (already at 12.1.0) for magic-byte validation and resize, and `uuid4()` for safe filename generation.

For the payment flow, the existing `POST /api/v1/payments/initiate` endpoint and `RedsysService` are reused unchanged. Only the `PaymentType` enum needs a new value (`SEMINAR_OFICIALIDAD`) and the webhook use case needs a new dispatch branch. The price is managed via the existing `PriceConfiguration` system with a new key — no new UI needed.

**Core technologies:**
- `FastAPI UploadFile` (0.115.6): receive multipart file uploads — already supported, python-multipart already installed
- `fastapi.staticfiles.StaticFiles` (0.115.6): serve uploaded images over HTTP — ships with FastAPI, one mount call
- `Pillow` (12.1.0): validate via magic bytes + resize to 1200px max width before saving — already installed, pattern used in `license_image_service.py`
- `uuid4()` (stdlib): generate safe filenames — prevents path traversal and cache collisions
- `PaymentType.SEMINAR_OFICIALIDAD`: new enum value routing webhook dispatch — zero new infrastructure
- `PriceConfiguration` with key `seminar_oficialidad`: configurable price via existing super admin UI — no new UI

### Expected Features

**Must have (table stakes):**
- Image upload control in seminar form with client-side preview (`URL.createObjectURL()`) and validation (type + size)
- Cover image displayed in seminar card list (top area, fixed height ~180px, `object-fit: cover`) with graceful placeholder fallback
- Cover image displayed in seminar detail dialog
- File size limit enforced both client-side (before network) and server-side (streaming byte counter, max 5MB)
- "Solicitar Oficialidad" button visible only to club admins on non-official seminars belonging to their club
- Confirmation dialog showing configured price before Redsys redirect
- Redsys payment redirect using existing payment flow — no new payment page needed
- Webhook auto-marks seminar as official on confirmed payment (no manual approval step)
- Official seal/badge (Spain Aikikai logo) displayed on card and in detail when `is_official === true`
- Button disappears once seminar is official (frontend gates on `is_official`)
- Success page context-awareness when returning from oficialidad payment

**Should have (competitive):**
- Spain Aikikai seal as CSS overlay on the cover photo (position:absolute on card image) for visual impact
- Oficialidad price hint in seminar card footer before payment initiation
- Email notification to club admin after oficialidad confirmed (existing email system, webhook trigger point)

**Defer (v2+):**
- Photo gallery (multiple images per seminar) — multiplies upload complexity
- Image CDN / object storage (S3/MinIO) — over-engineered for current scale
- Oficialidad revocation — requires complex Redsys refund flow, not specified
- Browser-side image cropping — significant canvas complexity

### Architecture Approach

The architecture follows the existing hexagonal pattern: domain entity changes in the innermost layer first, then application use case, then infrastructure (repository, DTOs, router, DI), then frontend schema, service, mutations, context, and finally components. The build order has 13 explicit steps with clear dependency gates — each step is verifiable in isolation. The key architectural principle is that `is_official = true` must only be set inside `ProcessRedsysWebhookUseCase` (after Redsys confirms payment), never in the router or initiation response.

**Major components:**
1. `Seminar` domain entity extension — adds `cover_image_url`, `is_official`, `official_payment_id` and `mark_as_official()` business method; foundation for all other changes
2. `UploadSeminarCoverImageUseCase` (new) — validates magic bytes, resizes with Pillow, saves to `/app/uploads/seminars/{uuid}.jpg`, updates seminar record with relative URL
3. `ProcessRedsysWebhookUseCase` extension — adds `_mark_seminar_official()` private method dispatched when `payment_type == SEMINAR_OFICIALIDAD`; injected with `seminar_repository` as optional dep following existing pattern
4. `MongoDBSeminarRepository` extension — adds 3 new fields to `_to_domain()` using `.get()` with defaults and `_to_document()`; adds `mark_as_official()` method
5. `SeminarOfficialButton.tsx` (new component) — fetches price from PriceConfiguration, shows confirmation dialog, calls `initiateOficialidadPayment`, redirects to Redsys
6. `SeminarForm.tsx` / `SeminarList.tsx` extensions — image upload field with preview; official badge overlay and cover image thumbnail

### Critical Pitfalls

1. **MIME type spoofing** — Never trust `UploadFile.content_type` (client-controlled header). Always validate via Pillow `Image.open()` try/except or magic bytes inspection on actual file content. Existing `license_image_service.py` pattern is the model to follow.

2. **Path traversal via filename** — Never use `file.filename` in disk path construction. Always generate `uuid4().hex` as the stored filename. The original filename can be stored in MongoDB as metadata only.

3. **Webhook non-idempotency** — The existing `CONCERNS.md` explicitly flags this gap. Add an early-exit guard `if payment.status == PaymentStatus.COMPLETED: return` at the top of `execute()` before any state mutation. For the seminar specifically, `mark_as_official()` must raise (not silently succeed) if `is_official` is already `True`, and the webhook branch must check before calling.

4. **Schema drift on existing MongoDB documents** — Adding `is_official: bool = False` to the entity does not backfill existing seminar documents. The repository mapper must use `doc.get("is_official", False)` (never bracket access). A one-time migration script is required: `db.seminars.update_many({"is_official": {"$exists": false}}, {"$set": {"is_official": false}})`.

5. **Static file directory isolation** — FastAPI `StaticFiles` serves ALL files in the mounted directory tree without authentication. The upload directory for seminar covers must be completely isolated from invoice PDFs and license templates. Mount only `/app/uploads/seminars/`, not a parent directory that could expose other sensitive files.

---

## Implications for Roadmap

Based on research, the natural dependency structure yields 3 phases with a clear build order.

### Phase 1: Domain Foundation + Cover Image Upload

**Rationale:** Both features share the Seminar domain entity changes. The entity extension (`cover_image_url`, `is_official`, `official_payment_id`) must be the first commit since it unblocks all downstream work. Cover image upload is self-contained and can be fully delivered before the payment flow. It also surfaces the file handling patterns (validation, storage, serving) that the payment flow does not need but establishes good practices for the project.

**Delivers:** Club admins can upload and replace seminar cover images. Images appear in card list and detail dialog. Seminar entity is ready to track official status.

**Addresses:**
- `Seminar.cover_image_url` and `is_official` fields in domain entity, MongoDB, DTO, mapper
- `UploadSeminarCoverImageUseCase` with Pillow validation and resize
- `POST /api/v1/seminars/{id}/cover-image` endpoint
- `StaticFiles` mount in `app.py` (isolated to `/app/uploads/seminars/`)
- Frontend schema, service, mutation, and form component for image upload
- Cover image display in `SeminarList.tsx` and detail dialog

**Avoids:**
- MIME type spoofing: magic-byte validation in use case, not `content_type` header
- Path traversal: UUID filename generation before disk write
- File size DoS: streaming byte counter with 5MB limit
- Pillow decompression bomb: `Image.MAX_IMAGE_PIXELS = 10_000_000` before `Image.open()`
- Static file directory leak: mount scoped strictly to seminar covers subdirectory
- Schema drift: `doc.get("is_official", False)` in mapper + migration script

### Phase 2: Oficialidad Payment Flow

**Rationale:** Depends on Phase 1 being complete because `Seminar.is_official` and `SeminarRepository.mark_as_official()` must exist before the webhook branch can use them. The `PaymentType.SEMINAR_OFICIALIDAD` enum value must be added before the webhook extension is built. The entire payment flow reuses existing infrastructure — only the dispatch branch and the price configuration entry are new backend additions.

**Delivers:** Club admins can initiate an oficialidad payment. After Redsys confirms payment, seminar is automatically marked official. Official seal badge appears in card and detail view. "Solicitar Oficialidad" button disappears once seminar is official.

**Addresses:**
- `PaymentType.SEMINAR_OFICIALIDAD` enum addition
- `ProcessRedsysWebhookUseCase` extension with `_mark_seminar_official()` and idempotency guard
- `PriceConfiguration` entry with key `seminar_oficialidad` (super admin configurable)
- Dedicated `POST /api/v1/seminars/{id}/iniciar-oficialidad` endpoint (or reuse `/payments/initiate` directly with frontend sending correct payload)
- `SeminarOfficialButton.tsx` component: price fetch, confirmation dialog, Redsys redirect
- Official badge in `SeminarList.tsx` and detail dialog
- Payment-success page context awareness for oficialidad flow
- DI update: inject `seminar_repository` into `get_process_redsys_webhook_use_case`

**Avoids:**
- Webhook idempotency gap: `if payment.status == COMPLETED: return` guard added before any state mutation
- Race condition: `find_one_and_update` with status filter for atomic payment completion
- Payment type routing confusion: distinct `SEMINAR_OFICIALIDAD` enum value (not reusing `SEMINAR`)
- `is_official` set in router (wrong): set only in webhook use case after Redsys confirmation
- Hardcoded price: always read from `PriceConfiguration`, never hardcoded in use case

### Phase 3: Polish + Validation

**Rationale:** The visual differentiators and UX polish items (seal overlay on cover photo, price hint in card, email notification, upload progress indicator) are low-risk enhancements that build on Phase 1 and 2 deliverables. Separating them allows Phases 1 and 2 to be tested end-to-end before adding cosmetic layers. Email notification belongs here since it requires the webhook to be stable first.

**Delivers:** Official seminars are visually distinguished with Spain Aikikai seal overlay on cover photo. Club admins see the oficialidad price on cards before clicking. Email notification is sent to club admin after payment is confirmed.

**Addresses:**
- Spain Aikikai seal as CSS `position:absolute` overlay on card image (when `is_official && cover_image_url`)
- Oficialidad price hint in seminar card footer (fetched from PriceConfiguration)
- Upload progress indicator in SeminarForm (axios `onUploadProgress`)
- Email notification trigger in webhook use case after `_mark_seminar_official()` succeeds
- `payment-success.page.tsx` context-aware messaging for oficialidad flow
- Docker volume mount documentation: `./uploads:/app/uploads` in `docker-compose.yml`

**Avoids:**
- Badge shown based on Redsys redirect URL params (wrong): only show after React Query refetch confirms `is_official === true`
- Old image stale in browser: UUID filename + React Query cache invalidation after upload

### Phase Ordering Rationale

- **Domain entity first:** Both features share `Seminar.cover_image_url` and `is_official`. Building the entity extension as the first commit means all downstream work compiles and tests from the start.
- **Cover image before payment:** The file upload feature is fully self-contained. Delivering it first provides user value while the payment integration is being built and tested, and establishes the Pillow/storage patterns.
- **Payment flow as Phase 2:** Depends on Phase 1 entity changes and repository `mark_as_official()`. The webhook extension is the highest-complexity piece and benefits from a clean domain foundation.
- **Polish as Phase 3:** Purely additive — does not block core functionality. Allows QA of core flows before adding cosmetic enhancements.
- **Never mix file handling and payment in one phase:** The security requirements for file upload (magic bytes, UUID filenames, size limits) and the correctness requirements for payment webhooks (idempotency, atomic updates) are distinct concerns. Separating them makes each phase's acceptance criteria clean.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (webhook idempotency):** The existing `CONCERNS.md` explicitly flags the webhook idempotency gap. Before implementing the oficialidad branch, inspect the current `ProcessRedsysWebhookUseCase` for the exact location to insert the early-exit guard and verify the `find_one_and_update` pattern in `mongodb_payment_repository.py`.
- **Phase 2 (DI wiring):** `dependencies.py` is a large file (580+ lines). The `get_process_redsys_webhook_use_case` factory needs inspection before modifying to understand the current optional-repository injection pattern.

Phases with standard patterns (skip research-phase):
- **Phase 1 (file upload):** Fully documented in STACK.md with code examples. Pattern already exists in `license_image_service.py`. No research needed — implementation can proceed directly.
- **Phase 1 (domain entity extension):** Adding Optional fields to a Python dataclass and updating `_to_domain`/`_to_document` is a mechanical change. Pattern repeated throughout the codebase.
- **Phase 3 (CSS overlay badge):** Pure frontend CSS with `position:absolute`. Well-documented, no research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are already installed in the project. No new dependencies to evaluate. Research confirmed via direct codebase inspection and official FastAPI docs. |
| Features | HIGH | Based on direct inspection of existing codebase components plus project requirements in `.planning/PROJECT.md`. Feature set is tightly scoped with explicit anti-features documented. |
| Architecture | HIGH | Based on direct inspection of all affected files (`process_redsys_webhook_use_case.py`, `mongodb_seminar_repository.py`, `seminars.py`, etc.). Build order has 13 explicit steps with verified dependency gates. |
| Pitfalls | HIGH | Critical pitfalls verified against codebase (`.planning/codebase/CONCERNS.md` explicitly flags webhook idempotency gap). Security pitfalls verified against multiple web sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **`aiofiles` presence:** STACK.md recommends checking `pyproject.toml` for `aiofiles` (transitive dep of `StaticFiles`). Verify before mounting static files. If absent: `poetry add aiofiles`. Low risk, one-line fix.
- **`INVOICE_OUTPUT_DIR` path:** Before choosing the upload directory for seminar covers, verify where invoice PDFs are currently stored to ensure directory isolation. The PITFALLS research flags this as a potential leak vector if directories overlap.
- **Price config `VALID_CATEGORIES`:** ARCHITECTURE.md notes that the `PriceConfiguration` entity has `VALID_CATEGORIES`. Using `category="club_fee"` with key `"seminar_oficialidad"` is the recommended approach (works without entity change), but this should be verified against the actual `price_configuration.py` entity validation during implementation.
- **Docker volume mount:** `docker-compose.yml` needs a `./uploads:/app/uploads` volume mount for persistence. This is a deployment concern not covered in current codebase analysis and must be addressed before Phase 1 goes to production.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `backend/src/domain/entities/seminar.py`, `payment.py`, `price_configuration.py`
- Direct codebase inspection: `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
- Direct codebase inspection: `backend/src/infrastructure/adapters/services/license_image_service.py` (Pillow pattern)
- Direct codebase inspection: `backend/src/infrastructure/web/dependencies.py` (DI patterns)
- Direct codebase inspection: `frontend/src/features/seminars/` (schema, service, context, components)
- `.planning/codebase/CONCERNS.md` — webhook idempotency gap documented at line 234-237
- [FastAPI UploadFile reference](https://fastapi.tiangolo.com/reference/uploadfile/) — official docs
- [FastAPI Static Files tutorial](https://fastapi.tiangolo.com/tutorial/static-files/) — official docs

### Secondary (MEDIUM confidence)
- [FastAPI file uploads guide — Better Stack 2025](https://betterstack.com/community/guides/scaling-python/uploading-files-using-fastapi/) — security patterns, magic bytes validation
- [FastAPI image optimization — Medium 2025](https://medium.com/@sizanmahmud08/fastapi-image-optimization-a-complete-guide-to-faster-and-smarter-file-handling-38705e5a7b3c) — Pillow + BytesIO pattern
- [Webhook idempotency patterns — Hookdeck](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- [MIME type bypass vulnerabilities — Sourcery](https://www.sourcery.ai/vulnerabilities/file-upload-content-type-bypass/)

### Tertiary (LOW confidence — single source)
- [File uploads with Python FastAPI — ionx](https://blog.ionxsolutions.com/p/file-uploads-with-python-fastapi/) — supplementary upload patterns

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
