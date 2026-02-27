# Architecture Research

**Domain:** Brownfield FastAPI + React backoffice — seminar image upload + oficialidad payment extension
**Researched:** 2026-02-27
**Confidence:** HIGH (based on direct codebase inspection, not inference)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19 + TypeScript)           │
│                                                                 │
│  seminars.page.tsx                                              │
│       └── SeminarProvider (useSeminarContext.tsx)               │
│               ├── SeminarList.tsx ──── shows badge if official  │
│               ├── SeminarForm.tsx ─── adds image upload field   │
│               └── SeminarOfficialButton.tsx (NEW component)     │
│                        │                                        │
│          seminar.service.ts  +  payment.service.ts              │
│          (uploadCoverImage, initiateOficialidadPayment)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / multipart/form-data
┌───────────────────────────┴─────────────────────────────────────┐
│                    BACKEND (FastAPI + Motor)                     │
│                                                                 │
│  /api/v1/seminars/{id}/cover-image  POST (new endpoint)         │
│  /api/v1/payments/initiate           POST (existing, reused)    │
│  /api/v1/payments/webhook            POST (existing, extended)  │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────────────────────┐    │
│  │  Application    │   │  Application                     │    │
│  │  UploadSeminar  │   │  ProcessRedsysWebhookUseCase      │    │
│  │  CoverImageUC   │   │  (extended: handle seminar_       │    │
│  │  (NEW use case) │   │   oficialidad payment_type)       │    │
│  └────────┬────────┘   └────────────────┬─────────────────┘    │
│           │                             │                       │
│  ┌────────┴────────────────────────────┴─────────────────┐     │
│  │              Domain Layer                              │     │
│  │  Seminar entity  +3 optional fields                   │     │
│  │  PaymentType enum  +SEMINAR_OFICIALIDAD value          │     │
│  │  PriceConfiguration  key="seminar_oficialidad"         │     │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Infrastructure Layer                         │  │
│  │  MongoDBSeminarRepository  (extended _to_domain/         │  │
│  │    _to_document for 3 new fields)                        │  │
│  │  Local filesystem  (store image under /uploads/seminars/)│  │
│  │  RedsysService  (unchanged — generic payment engine)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries — What Talks to What

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `Seminar` domain entity | Owns `cover_image_url`, `is_official`, `official_payment_id`; enforces invariants | Nothing (pure) |
| `PaymentType` enum | Declares `SEMINAR_OFICIALIDAD` payment type | `Payment` entity, `InitiateRedsysPaymentUseCase` |
| `PriceConfiguration` entity | Stores the oficialidad price under key `seminar_oficialidad` | `PriceConfigurationRepositoryPort` |
| `UploadSeminarCoverImageUseCase` | Receives file bytes, saves to filesystem, updates seminar | `SeminarRepositoryPort`, filesystem |
| `InitiateRedsysPaymentUseCase` | Already generic — accepts any `payment_type` string; reused unchanged | `PaymentRepositoryPort`, `RedsysServicePort` |
| `ProcessRedsysWebhookUseCase` | Extended: when payment_type is `seminar_oficialidad`, fetches seminar by `related_entity_id` and calls `seminar.mark_as_official()` | `SeminarRepositoryPort` (injected as optional) |
| `MongoDBSeminarRepository` | Persists the three new fields alongside existing fields | MongoDB `seminars` collection |
| `seminars.py` router | Adds `POST /{id}/cover-image` endpoint (multipart); existing CRUD endpoints updated to pass new fields through | `UploadSeminarCoverImageUseCase`, `AuthContext` |
| `SeminarMapper` | Extended: maps new fields in `to_response_dto` and `from_create_dto` | `SeminarResponse` DTO |
| `seminar_dto.py` | `SeminarResponse` gains `cover_image_url`, `is_official`, `official_payment_id` | `SeminarMapper` |
| Frontend `seminar.schema.ts` | Adds `cover_image_url?: string`, `is_official: boolean`, `official_payment_id?: string` to `Seminar` interface | All hooks and components |
| Frontend `seminar.service.ts` | Adds `uploadCoverImage(id, file)` using `multipart/form-data`; adds `initiateOficialidadPayment(seminarId, clubId)` delegating to `paymentService` | `apiClient` |
| Frontend `SeminarOfficialButton.tsx` (new) | Triggers payment flow for oficialidad; shows payment form | `useSeminarContext`, `usePaymentContext` or direct mutation |
| Frontend `SeminarList.tsx` | Adds official badge (Spain Aikikai seal) and cover image thumbnail | `useSeminarContext` |
| Frontend `SeminarForm.tsx` | Adds image upload field | `useSeminarContext` |

---

## Recommended Extension Structure

Only files that change or are created are listed. All other existing files remain untouched.

```
backend/src/
├── domain/
│   └── entities/
│       └── seminar.py                    # MODIFY: add cover_image_url, is_official,
│                                         #   official_payment_id fields + mark_as_official()
│       └── payment.py                    # MODIFY: add SEMINAR_OFICIALIDAD to PaymentType enum
│
├── application/
│   └── use_cases/
│       └── seminar/
│           └── upload_cover_image_use_case.py   # NEW: save file, update seminar
│           └── [existing use cases unchanged]
│
├── infrastructure/
│   ├── adapters/
│   │   └── repositories/
│   │       └── mongodb_seminar_repository.py    # MODIFY: _to_domain + _to_document
│   │                                             #   for 3 new fields
│   └── web/
│       ├── dto/
│       │   └── seminar_dto.py                   # MODIFY: add 3 fields to SeminarResponse
│       ├── mappers_seminar.py                   # MODIFY: map 3 new fields
│       ├── routers/
│       │   └── seminars.py                      # MODIFY: add POST /{id}/cover-image endpoint
│       └── dependencies.py                      # MODIFY: register UploadSeminarCoverImageUseCase
│                                                 #   + inject SeminarRepository into
│                                                 #   ProcessRedsysWebhookUseCase

frontend/src/features/seminars/
├── data/
│   ├── schemas/seminar.schema.ts         # MODIFY: add 3 new fields to Seminar interface
│   └── services/seminar.service.ts       # MODIFY: add uploadCoverImage(), add
│                                         #   initiateOficialidadPayment()
├── hooks/
│   ├── useSeminarContext.tsx             # MODIFY: expose uploadCoverImage,
│   │                                     #   initiateOficialidad actions
│   └── mutations/useSeminarMutations.ts  # MODIFY: add useUploadCoverImageMutation,
│                                         #   useInitiateOficialidadMutation
└── components/
    ├── SeminarList.tsx                   # MODIFY: render official badge + cover image
    ├── SeminarForm.tsx                   # MODIFY: add image upload field
    └── SeminarOfficialButton.tsx         # NEW: oficialidad CTA + payment redirect
```

---

## Architectural Patterns

### Pattern 1: Extend the Domain Entity with Optional Fields

**What:** Add `cover_image_url`, `is_official`, and `official_payment_id` directly to the `Seminar` dataclass. All three are `Optional` with safe defaults so existing seminar records (which lack these fields) deserialize without error.

**When to use:** When adding data that belongs to the aggregate but is not required for existing business operations. These fields have no invariants that interact with the existing `cancel()`, `mark_as_ongoing()`, etc. methods.

**Trade-offs:** Keeping them on the entity is simpler than a separate `SeminarOfficialidad` document. The risk of the entity growing large is low given the bounded scope of this project.

**Example:**
```python
# seminar.py — only additions shown
from typing import Optional

@dataclass
class Seminar:
    # ... existing fields unchanged ...
    cover_image_url: Optional[str] = None
    is_official: bool = False
    official_payment_id: Optional[str] = None

    def mark_as_official(self, payment_id: str) -> None:
        """Mark seminar as officially endorsed by Spain Aikikai."""
        if self.is_official:
            raise ValueError("Seminar is already official")
        if not payment_id:
            raise ValueError("Payment ID is required to mark seminar as official")
        self.is_official = True
        self.official_payment_id = payment_id
        self.updated_at = datetime.utcnow()
```

### Pattern 2: File Upload via Dedicated Use Case — Filesystem Storage

**What:** The image upload does not go through the existing `UpdateSeminarUseCase`. Instead, a new `UploadSeminarCoverImageUseCase` handles: save bytes to disk, derive a URL path, call `seminar_repository.update()` with the new `cover_image_url`. The URL stored is a relative path that the backend serves as a static file route.

**When to use:** Separating file I/O from the general update keeps `UpdateSeminarUseCase` clean and makes the upload independently testable. The constraint says Pillow is already available for optional image processing (resize/compress before saving).

**Trade-offs:** Local filesystem is simpler than cloud storage for the current deployment (Dokploy self-hosted), but requires the upload directory to be mounted as a persistent volume in Docker. The stored URL should be a relative path like `/uploads/seminars/{seminar_id}.jpg` so the absolute host can change without a data migration.

**Example:**
```python
# upload_cover_image_use_case.py
class UploadSeminarCoverImageUseCase:
    def __init__(self, seminar_repository: SeminarRepositoryPort, upload_dir: str):
        self.seminar_repository = seminar_repository
        self.upload_dir = upload_dir  # e.g. "/app/uploads/seminars"

    async def execute(self, seminar_id: str, file_bytes: bytes, filename: str) -> Seminar:
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise EntityNotFoundError(f"Seminar {seminar_id} not found")

        # Optional: resize with Pillow before saving
        safe_ext = Path(filename).suffix.lower() or ".jpg"
        dest_path = Path(self.upload_dir) / f"{seminar_id}{safe_ext}"
        dest_path.write_bytes(file_bytes)

        seminar.cover_image_url = f"/uploads/seminars/{seminar_id}{safe_ext}"
        seminar.updated_at = datetime.utcnow()
        return await self.seminar_repository.update(seminar)
```

**FastAPI router endpoint:**
```python
# seminars.py router — new endpoint
@router.post("/{seminar_id}/cover-image", response_model=SeminarResponse)
async def upload_cover_image(
    seminar_id: str,
    file: UploadFile = File(...),
    upload_use_case = Depends(get_upload_seminar_cover_image_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    existing = await get_seminar_use_case.execute(seminar_id)
    if not ctx.is_super_admin:
        check_club_access_ctx(ctx, existing.club_id or "")
    file_bytes = await file.read()
    seminar = await upload_use_case.execute(seminar_id, file_bytes, file.filename)
    return SeminarMapper.to_response_dto(seminar)
```

**Static file serving** — add one line to `app.py`:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")
```

### Pattern 3: Extend the Webhook Use Case for New Payment Type

**What:** `ProcessRedsysWebhookUseCase` already routes behavior by `payment.payment_type`. Add a branch: when `payment_type == PaymentType.SEMINAR_OFICIALIDAD`, call `seminar_repository.find_by_id(payment.related_entity_id)`, then `seminar.mark_as_official(payment.id)`, then `seminar_repository.update(seminar)`. The `SeminarRepositoryPort` is injected as an optional dependency (matching the existing pattern for optional repos in this use case).

**When to use:** The webhook is the single authoritative point where payment completion triggers downstream effects. This is where licenses are generated, insurance is created — oficialidad follows the same pattern. Adding a branch here keeps all "what happens after payment" logic in one place.

**Trade-offs:** The webhook use case is already large (533 lines). The new branch adds ~15 lines. This is acceptable for a brownfield extension. The alternative — a separate use case that the webhook delegates to — is a future refactor target but not necessary now.

**Example:**
```python
# process_redsys_webhook_use_case.py — only the new branch shown
# In __init__, add: seminar_repository: Optional[SeminarRepositoryPort] = None
# In execute(), after payment.complete_payment(...):

if payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD:
    await self._mark_seminar_official(payment)

async def _mark_seminar_official(self, payment: Payment) -> None:
    if not self.seminar_repository or not payment.related_entity_id:
        return
    try:
        seminar = await self.seminar_repository.find_by_id(payment.related_entity_id)
        if seminar:
            seminar.mark_as_official(payment.id)
            await self.seminar_repository.update(seminar)
    except Exception:
        import logging
        logging.getLogger(__name__).exception(
            "Failed to mark seminar %s as official for payment %s",
            payment.related_entity_id, payment.id
        )
        # Do not re-raise — payment is already recorded
```

### Pattern 4: Frontend Oficialidad Payment Flow

**What:** The frontend triggers oficialidad by calling `POST /api/v1/payments/initiate` with `payment_type: "seminar_oficialidad"`, `related_entity_id: seminarId`, and `amount` fetched from `PriceConfiguration`. On response, the frontend receives the Redsys form data and performs a redirect to the Redsys payment URL (identical to the existing payment flow used for licenses).

**When to use:** The existing `payment.service.ts` and payment redirect logic is already implemented and working. Reuse it entirely. The only new frontend code is the trigger button and the price fetch.

**Trade-offs:** The club admin leaves the app to complete payment at Redsys, then returns via the existing `/payment/success` callback page. The seminar list will show the official badge only after the page refreshes (React Query cache invalidation on next load). If real-time feedback is needed, the success page can trigger a cache invalidation for `['seminars']`.

**Example:**
```typescript
// seminar.service.ts — new function only
export const initiateOficialidadPayment = async (
  seminarId: string,
  clubId: string,
  amount: number
): Promise<InitiatePaymentResponse> => {
  return await apiClient.post<InitiatePaymentResponse>('/api/v1/payments/initiate', {
    payment_type: 'seminar_oficialidad',
    related_entity_id: seminarId,
    club_id: clubId,
    amount,
    description: `Oficialidad seminario`,
  });
};

// uploadCoverImage — sends multipart/form-data
export const uploadCoverImage = async (seminarId: string, file: File): Promise<Seminar> => {
  const form = new FormData();
  form.append('file', file);
  return await apiClient.post<Seminar>(`/api/v1/seminars/${seminarId}/cover-image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

---

## Explicit Build Order

This is the dependency-safe sequence. Each step can be verified in isolation before moving to the next.

### Step 1: Domain Layer — Seminar Entity Extension
**Files:** `backend/src/domain/entities/seminar.py`
**Changes:**
- Add `cover_image_url: Optional[str] = None`
- Add `is_official: bool = False`
- Add `official_payment_id: Optional[str] = None`
- Add `mark_as_official(payment_id: str)` business method
**Dependency:** None. No other files change here.
**Verify:** Existing tests still pass. Unit test `mark_as_official` directly on entity.

### Step 2: Domain Layer — PaymentType Enum Extension
**Files:** `backend/src/domain/entities/payment.py`
**Changes:**
- Add `SEMINAR_OFICIALIDAD = "seminar_oficialidad"` to `PaymentType` enum
**Dependency:** Step 1 complete (entity changes make the payment meaningful)
**Verify:** No existing tests break (enum extension is backwards-compatible).

### Step 3: Infrastructure Layer — MongoDB Repository Extension
**Files:** `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py`
**Changes:**
- `_to_domain`: add `cover_image_url=doc.get("cover_image_url")`, `is_official=doc.get("is_official", False)`, `official_payment_id=doc.get("official_payment_id")`
- `_to_document`: add the three fields
**Dependency:** Steps 1 complete (new entity fields must exist before mapping them)
**Verify:** Existing MongoDB documents without these fields deserialize correctly (`.get()` with defaults handles missing keys).

### Step 4: Application Layer — UploadSeminarCoverImageUseCase
**Files:** `backend/src/application/use_cases/seminar/upload_cover_image_use_case.py`
**Changes:** New file implementing the use case (see Pattern 2 above)
**Dependency:** Steps 1, 3 complete (entity has `cover_image_url`, repository can persist it)
**Verify:** Unit test with mocked repository. Test that invalid seminar ID raises `EntityNotFoundError`.

### Step 5: Application Layer — Webhook Use Case Extension
**Files:** `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
**Changes:**
- Inject `seminar_repository: Optional[SeminarRepositoryPort] = None` in `__init__`
- Add `_mark_seminar_official()` private method
- Call it in `execute()` when `payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD`
**Dependency:** Steps 1, 2, 3 complete (entity has `mark_as_official`, payment type exists, repository maps new fields)
**Verify:** Unit test the new branch with mocked seminar repository. Verify existing webhook behavior is unchanged for all other payment types.

### Step 6: Infrastructure Layer — DTOs and Mappers
**Files:**
- `backend/src/infrastructure/web/dto/seminar_dto.py` — add 3 fields to `SeminarResponse` (all Optional)
- `backend/src/infrastructure/web/mappers_seminar.py` — map 3 new fields in `to_response_dto`
**Dependency:** Step 1 complete (entity fields exist to map from)
**Verify:** Existing API tests for seminar endpoints pass (new fields are Optional, backwards-compatible).

### Step 7: Infrastructure Layer — Router Extension
**Files:** `backend/src/infrastructure/web/routers/seminars.py`
**Changes:**
- Add `POST /{seminar_id}/cover-image` endpoint using `UploadFile`
**Dependency:** Steps 4, 6 complete (use case exists, mapper handles new fields)
**Verify:** Manual or API test: upload a file, confirm response contains `cover_image_url`.

### Step 8: Infrastructure Layer — Dependency Injection
**Files:** `backend/src/infrastructure/web/dependencies.py`
**Changes:**
- Add `get_upload_seminar_cover_image_use_case()` factory with `@lru_cache()`
- Update `get_process_redsys_webhook_use_case()` to inject `seminar_repository` argument
- Add static file mount in `app.py` for `/uploads`
**Dependency:** Steps 4, 5 complete (use cases must exist before registering them)
**Verify:** Backend starts without errors. Existing webhook dependency still resolves.

### Step 9: Frontend — Schema Extension
**Files:** `frontend/src/features/seminars/data/schemas/seminar.schema.ts`
**Changes:**
- Add `cover_image_url?: string`, `is_official: boolean`, `official_payment_id?: string` to `Seminar` interface
**Dependency:** None (independent of backend — TypeScript compilation verifies alignment)
**Verify:** TypeScript compilation passes with no new errors.

### Step 10: Frontend — Service Extension
**Files:** `frontend/src/features/seminars/data/services/seminar.service.ts`
**Changes:**
- Add `uploadCoverImage(seminarId, file)` using multipart/form-data
- Add `initiateOficialidadPayment(seminarId, clubId, amount)` calling `/api/v1/payments/initiate`
**Dependency:** Step 9 complete (schema types used by service functions)
**Verify:** TypeScript compilation.

### Step 11: Frontend — Mutations
**Files:** `frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts`
**Changes:**
- Add `useUploadCoverImageMutation()` — on success invalidates `['seminars']`
- Add `useInitiateOficialidadMutation()` — on success redirects to Redsys payment URL
**Dependency:** Step 10 complete
**Verify:** TypeScript compilation.

### Step 12: Frontend — Context Extension
**Files:** `frontend/src/features/seminars/hooks/useSeminarContext.tsx`
**Changes:**
- Add `uploadCoverImage` and `initiateOficialidad` to context type and provider value
**Dependency:** Step 11 complete
**Verify:** TypeScript compilation. No prop-drilling needed — all consumers use context hook.

### Step 13: Frontend — Components
**Files:**
- `frontend/src/features/seminars/components/SeminarForm.tsx` — add image upload `<Input type="file">` field
- `frontend/src/features/seminars/components/SeminarList.tsx` — render official badge (Spain Aikikai seal) on cards where `is_official === true`; render `cover_image_url` thumbnail
- `frontend/src/features/seminars/components/SeminarOfficialButton.tsx` — NEW: button visible to club admins on non-official seminars; fetches price from `PriceConfiguration` API, then calls `initiateOficialidad`; on response, redirects to `form_data.payment_url` via form POST (matching how the existing payment flow works)
**Dependency:** Step 12 complete
**Verify:** Visual inspection. Storybook or manual test.

---

## Data Flow

### Cover Image Upload Flow

```
Club Admin clicks "Upload Image" in SeminarForm
    ↓
useUploadCoverImageMutation.mutate({ seminarId, file })
    ↓
seminar.service.ts: POST /api/v1/seminars/{id}/cover-image  [multipart/form-data]
    ↓
seminars.py router: upload_cover_image endpoint
    ├─ AuthContext: check club ownership
    ├─ Depends(get_upload_seminar_cover_image_use_case)
    ↓
UploadSeminarCoverImageUseCase.execute(seminar_id, file_bytes, filename)
    ├─ find seminar by ID (raises EntityNotFoundError if missing)
    ├─ save bytes to /app/uploads/seminars/{seminar_id}.jpg
    ├─ seminar.cover_image_url = "/uploads/seminars/{id}.jpg"
    ├─ seminar_repository.update(seminar)
    ↓
SeminarMapper.to_response_dto(seminar)  [cover_image_url now populated]
    ↓
React Query: invalidate ['seminars'] → list re-fetches → image shown in list
```

### Oficialidad Payment Flow

```
Club Admin clicks "Solicitar Oficialidad" button (SeminarOfficialButton)
    ↓
Fetch price: GET /api/v1/price-configurations?key=seminar_oficialidad
    ↓
useInitiateOficialidadMutation.mutate({ seminarId, clubId, amount })
    ↓
payment.service.ts: POST /api/v1/payments/initiate
    body: { payment_type: "seminar_oficialidad", related_entity_id: seminarId,
            club_id: clubId, amount, description: "Oficialidad seminario" }
    ↓
payments.py router: initiate_payment endpoint (EXISTING, UNCHANGED)
    ↓
InitiateRedsysPaymentUseCase.execute(...)
    ├─ Creates Payment(payment_type=SEMINAR_OFICIALIDAD, related_entity_id=seminarId)
    ├─ mark_as_processing(), stores order_id as transaction_id
    ├─ calls redsys_service.create_payment_form_data(...)
    ↓
Returns: { payment_url, ds_signature_version, ds_merchant_parameters, ds_signature }
    ↓
Frontend: submits hidden HTML form to Redsys payment_url (existing pattern)
    ↓
[User completes card payment at Redsys]
    ↓
Redsys POSTs to: POST /api/v1/payments/webhook (existing endpoint)
    ↓
ProcessRedsysWebhookUseCase.execute(...)
    ├─ Verifies Redsys signature
    ├─ Finds payment by transaction_id (order_id)
    ├─ payment.complete_payment(...)
    ├─ NEW BRANCH: payment_type == SEMINAR_OFICIALIDAD
    │     ├─ seminar_repository.find_by_id(payment.related_entity_id)
    │     ├─ seminar.mark_as_official(payment.id)
    │     └─ seminar_repository.update(seminar)  → is_official=True in MongoDB
    ├─ Creates invoice (existing — uses payment_type value in description)
    ├─ Sends email notification (existing)
    ↓
Redsys redirects user to: /payment/success (existing page)
    ↓
payment-success.page.tsx (existing) — optionally invalidate ['seminars'] cache
    ↓
Next seminars list load: seminar shows is_official=true → official badge displayed
```

### PriceConfiguration for Oficialidad

The `PriceConfiguration` entity already supports arbitrary keys for non-license categories (category `"seminar"` or a new category `"seminar_oficialidad"`). The recommended approach is to add a new price config entry:

```python
PriceConfiguration(
    key="seminar_oficialidad",
    price=50.0,         # configured by super admin via existing price-configurations UI
    description="Precio de oficialidad de seminario",
    category="club_fee"  # reuse existing "club_fee" category for free-form keys
)
```

The `PriceConfiguration.VALID_CATEGORIES` does not validate keys for the `"club_fee"` category, so `"seminar_oficialidad"` works without modifying the entity. The super admin sets this price via the existing `/api/v1/price-configurations` CRUD endpoints and UI — no new UI needed for price management.

---

## Integration Points

### Redsys Extension

| Concern | Approach | File |
|---------|----------|------|
| New payment type | Add `SEMINAR_OFICIALIDAD` to `PaymentType` enum | `domain/entities/payment.py` |
| Payment initiation | Reuse existing `POST /payments/initiate` endpoint — no changes | `routers/payments.py` |
| Webhook routing | Add `if payment_type == SEMINAR_OFICIALIDAD:` branch in webhook UC | `process_redsys_webhook_use_case.py` |
| Invoice generation | Existing invoice creation runs automatically — no changes needed | `process_redsys_webhook_use_case.py` |
| Duplicate payment guard | `InitiateRedsysPaymentUseCase` checks `find_by_member_type_year` only for `member_id`-scoped payments. Oficialidad is club-scoped (no `member_id`), so no duplicate check fires — this is correct: a seminar can only be made official once, enforced by `mark_as_official()` raising if `is_official` is already True | `initiate_redsys_payment_use_case.py` |
| Redsys service | Completely unchanged — it is a generic signing engine | `redsys_service.py` |

### File Storage Integration

| Concern | Approach |
|---------|----------|
| Storage location | `/app/uploads/seminars/` on container filesystem |
| URL in MongoDB | Relative path: `/uploads/seminars/{seminar_id}.jpg` — absolute host not stored |
| Serving files | FastAPI `StaticFiles` mount at `/uploads` in `app.py` |
| Docker persistence | Add volume mount: `./uploads:/app/uploads` in `docker-compose.yml` |
| File naming | Use `seminar_id` as filename to make uploads idempotent — re-upload replaces previous |
| CORS | Served by same FastAPI origin — no CORS issue |
| File size limit | FastAPI default is unlimited; add `MAX_UPLOAD_SIZE` check in use case |
| Allowed types | Validate `file.content_type in {"image/jpeg", "image/png", "image/webp"}` in router before calling use case |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Oficialidad on a Separate Document

**What people do:** Create a new `SeminarOficialidad` MongoDB collection with `{seminar_id, payment_id, created_at}` to track oficialidad separately from the `Seminar` entity.

**Why it's wrong:** Adds a join at read time for every seminar list load. The seminar list needs to know `is_official` for every row to render the badge — a separate collection forces N additional queries or a MongoDB `$lookup`. The three new fields are small and belong on the seminar aggregate.

**Do this instead:** Add `cover_image_url`, `is_official`, `official_payment_id` directly to the `Seminar` dataclass and `seminars` MongoDB document. Read is O(1), no join needed.

### Anti-Pattern 2: Storing the Absolute Image URL in MongoDB

**What people do:** Store the full URL including hostname: `https://api.spainaikikai.es/uploads/seminars/abc123.jpg`.

**Why it's wrong:** If the domain or protocol changes (e.g. HTTP to HTTPS, staging vs production), all stored URLs become stale and require a data migration.

**Do this instead:** Store the relative path `/uploads/seminars/{seminar_id}.jpg`. The frontend constructs the full URL by prepending `VITE_API_URL` when needed for display.

### Anti-Pattern 3: Creating a New Webhook Endpoint for Oficialidad

**What people do:** Add `POST /api/v1/seminars/oficialidad/webhook` as a separate Redsys callback.

**Why it's wrong:** Redsys is configured with a single `merchant_url` per payment initiation. The existing webhook at `/api/v1/payments/webhook` already handles all payment types by routing on `payment_type`. Creating a second webhook doubles the signature verification code and Redsys configuration surface.

**Do this instead:** Route within the existing `ProcessRedsysWebhookUseCase.execute()` on `payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD`. This is exactly how future payment types should be added too.

### Anti-Pattern 4: Hardcoding the Oficialidad Price in the Use Case

**What people do:** Set `amount=50.0` in the `InitiateRedsysPaymentUseCase` or in a constant.

**Why it's wrong:** The PROJECT.md requirement explicitly states "El super admin configura el precio de la oficialidad desde el panel." The price must be configurable without a deploy.

**Do this instead:** The frontend reads the price from `GET /api/v1/price-configurations` filtered by `key=seminar_oficialidad` before showing the `SeminarOfficialButton`. The amount is passed to `POST /payments/initiate` from the frontend after reading the price config. This follows the same pattern used for annual payments.

### Anti-Pattern 5: Adding Oficialidad Business Logic Inside the Router

**What people do:** In `seminars.py`, after the payment response, directly call `seminar_repository.update()` to set `is_official=True`.

**Why it's wrong:** The router does not know if the payment succeeded — payment completion happens asynchronously via webhook, not synchronously in the initiation response. Setting `is_official` in the router would mark the seminar official before money has been collected.

**Do this instead:** Set `is_official=True` only inside `ProcessRedsysWebhookUseCase._mark_seminar_official()`, which runs only after Redsys confirms the transaction.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~10 clubs, ~500 seminars) | Local filesystem for images is fine. No CDN needed. |
| 1k-10k seminars | Add MongoDB index on `is_official` field for filtered list queries. Still local filesystem. |
| 100k+ seminars or multi-region deploy | Move images to S3-compatible object storage (MinIO or AWS S3). Abstract behind a `FileStoragePort` interface in application layer — swap implementation without touching use case logic. |

---

## Sources

- Direct inspection of `backend/src/domain/entities/seminar.py` — Seminar entity structure
- Direct inspection of `backend/src/domain/entities/payment.py` — PaymentType enum, Payment entity
- Direct inspection of `backend/src/infrastructure/adapters/services/redsys_service.py` — RedsysService is generic signing engine, no payment-type routing
- Direct inspection of `backend/src/application/use_cases/payment/initiate_redsys_payment_use_case.py` — accepts any payment_type string, club_id-only payments skip duplicate check
- Direct inspection of `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` — routing pattern for post-payment effects, optional repository injection pattern
- Direct inspection of `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` — `_to_domain`/`_to_document` pattern for new field addition
- Direct inspection of `backend/src/infrastructure/web/routers/seminars.py` — authorization pattern, club access checks
- Direct inspection of `backend/src/infrastructure/web/dto/seminar_dto.py` + `mappers_seminar.py` — extension points
- Direct inspection of `backend/src/domain/entities/price_configuration.py` — `club_fee` category accepts free-form keys
- Direct inspection of `frontend/src/features/seminars/` — schema, service, context structure
- `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `INTEGRATIONS.md` — project documentation

---

*Architecture research for: Spain Aikikai Admin — seminar image upload + oficialidad payment extension*
*Researched: 2026-02-27*
