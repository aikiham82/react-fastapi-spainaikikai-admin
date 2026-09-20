# Stack Research

**Domain:** Backoffice extension — file upload + new Redsys payment type on existing FastAPI + React stack
**Researched:** 2026-02-27
**Confidence:** HIGH

---

## Context: What We Are Extending

This is NOT a greenfield stack decision. The system already runs:
- FastAPI 0.115.6 + Motor 3.7.0 + MongoDB (hexagonal architecture)
- React 19 + React Hook Form 7.71.1 + Axios 1.10.0 + React Query 5 (feature-based architecture)
- Pillow 12.1.0 already installed (used by `license_image_service.py`)
- python-multipart 0.0.20 already installed (used for webhook `Form(...)` fields in `payments.py`)
- Redsys integration live via custom `RedsysService` + `InitiateRedsysPaymentUseCase` + `ProcessRedsysWebhookUseCase`
- No `StaticFiles` mount in `app.py` — needs adding

The two features require:
1. Seminar cover image: file upload endpoint → Pillow resize/validate → local disk → serve via StaticFiles
2. Oficialidad payment: new `PaymentType` enum value → reuse `InitiateRedsysPaymentUseCase` → webhook auto-marks seminar official

---

## Recommended Stack

### Core Technologies (all already installed — zero new dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| FastAPI `UploadFile` | 0.115.6 | Receive multipart file uploads | Built into FastAPI, requires `python-multipart` which is already installed. Type-safe, async-compatible, streams to `SpooledTemporaryFile` automatically |
| `fastapi.staticfiles.StaticFiles` | 0.115.6 | Serve uploaded images over HTTP | Ships with FastAPI/Starlette. One `app.mount()` call exposes an entire directory tree as static assets. Already used for license templates pattern |
| Pillow | 12.1.0 | Validate + resize cover images | Already used in `license_image_service.py`. Pattern is `Image.open(BytesIO(await file.read()))`. Add resize before saving |
| `aiofiles` | check pyproject | Async disk write for uploaded files | Required by `StaticFiles` for efficient async serving. Check if already present; if not, add via Poetry |
| `PaymentType` enum extension | — | `SEMINAR_OFICIALIDAD` value | Extend the existing `src/domain/entities/payment.py` enum — zero new infrastructure |
| `ProcessRedsysWebhookUseCase` extension | — | Auto-mark seminar official on payment completion | Add a branch in the existing `execute()` method that calls a new `mark_as_official()` method on `SeminarRepositoryPort` |

### Supporting Libraries (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python-multipart` | 0.0.20 | Parse `multipart/form-data` for file upload | Already installed. FastAPI reads it automatically when endpoint declares `UploadFile` parameter |
| `Pillow` `Image.open` + `Image.thumbnail` | 12.1.0 | Validate MIME type via magic bytes + resize | Use in new `SeminarImageService`. `image.verify()` detects corrupt/spoofed files; `image.thumbnail((800, 600))` constrains size |
| `io.BytesIO` | stdlib | Bridge between async-read bytes and Pillow | Pattern already used in `license_image_service.py:84` — `Image.open(self.template_path)` → adapt to `Image.open(BytesIO(content))` |
| `pathlib.Path` | stdlib | Construct upload paths safely | Already used in `license_image_service.py:40` — `Path(__file__).parent...` |
| `uuid` | stdlib | Generate unique filenames to avoid collisions | `uuid4()` as filename prefix prevents overwrite attacks |
| Axios `FormData` | 1.10.0 | Send `multipart/form-data` from frontend | Already in stack. Use `new FormData()` + `Content-Type: multipart/form-data` header override on the specific call |

---

## Approach: Cover Image Upload

### Backend — What to Build

**File storage: local disk, served via StaticFiles**

Use local filesystem (consistent with existing invoice PDF + license image pattern in `INTEGRATIONS.md`). The system deploys via Dokploy/Docker — a persistent volume covers the uploads directory. No object storage (S3/Cloudinary) is needed for this scope.

```python
# app.py — add ONCE after router includes
from fastapi.staticfiles import StaticFiles
import os

uploads_dir = os.environ.get("UPLOADS_DIR", "/app/uploads")
os.makedirs(f"{uploads_dir}/seminars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
```

URL pattern: `GET /uploads/seminars/{filename}` — frontend stores and requests this relative URL.

**Upload endpoint: dedicated route on seminars router**

```python
# seminars.py router — new endpoint
@router.post("/{seminar_id}/cover-image", response_model=SeminarResponse)
async def upload_seminar_cover_image(
    seminar_id: str,
    file: UploadFile = File(...),
    upload_use_case = Depends(get_upload_seminar_cover_image_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    ...
```

Why a separate endpoint (not part of `PUT /{seminar_id}`): file uploads use `multipart/form-data` which cannot be mixed with JSON body in FastAPI without explicit form field declarations. Keeping update as JSON and image as a separate POST is the standard FastAPI pattern.

**Image processing in use case (via new `SeminarImageService`)**

```python
# New service: src/infrastructure/adapters/services/seminar_image_service.py
async def process_and_save(self, file: UploadFile, seminar_id: str) -> str:
    content = await file.read()
    # Validate via Pillow magic bytes (not Content-Type header — easily spoofed)
    image = Image.open(BytesIO(content))
    image.verify()  # raises if corrupt/not image
    # Re-open after verify (verify() exhausts the object)
    image = Image.open(BytesIO(content))
    image.thumbnail((1200, 800), Image.LANCZOS)
    filename = f"{uuid4().hex}.jpg"
    path = self.uploads_dir / "seminars" / filename
    image.save(path, format="JPEG", quality=85, optimize=True)
    return f"/uploads/seminars/{filename}"  # URL stored in seminar.cover_image_url
```

**Domain entity changes required**

```python
# src/domain/entities/seminar.py — add two fields
cover_image_url: Optional[str] = None   # e.g. "/uploads/seminars/abc123.jpg"
is_official: bool = False               # set to True by webhook handler
```

**MongoDB repository changes required**

`mongodb_seminar_repository.py`: add `cover_image_url` and `is_official` to `_to_document()` and `_to_domain()`. Add `mark_as_official(seminar_id)` method.

**DTO + Mapper changes required**

`seminar_dto.py`: add `cover_image_url: Optional[str]` and `is_official: bool = False` to `SeminarResponse`.
`mappers_seminar.py`: map both new fields in `to_response_dto()`.

### Frontend — What to Build

**Separate upload call (not mixed into `updateSeminar`)**

```typescript
// seminar.service.ts — new function
export const uploadSeminarCoverImage = async (
  seminarId: string,
  file: File
): Promise<Seminar> => {
  const formData = new FormData();
  formData.append('file', file);
  return await apiClient.post<Seminar>(
    `${BASE_URL}/${seminarId}/cover-image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};
```

Why `Content-Type: multipart/form-data` override: the default `apiClient` sets `application/json`. FormData needs multipart boundary.

**Schema changes required**

```typescript
// seminar.schema.ts — add to Seminar interface
cover_image_url?: string;
is_official: boolean;
```

**Form component: React Hook Form + file input**

Use `<input type="file" accept="image/*" />` registered with `register('cover_image')` or handled as an uncontrolled ref. On submit: first call `updateSeminar()` for text fields, then call `uploadSeminarCoverImage()` if a file was selected. Two separate mutations, sequenced via `onSuccess` callback chain.

---

## Approach: Oficialidad Payment Flow

### Backend — What to Build

**New `PaymentType` enum value**

```python
# src/domain/entities/payment.py
class PaymentType(str, Enum):
    LICENSE = "license"
    ACCIDENT_INSURANCE = "accident_insurance"
    CIVIL_LIABILITY_INSURANCE = "civil_liability_insurance"
    ANNUAL_QUOTA = "annual_quota"
    SEMINAR = "seminar"
    SEMINAR_OFICIALIDAD = "seminar_oficialidad"  # NEW
```

No other enum file changes needed — `PaymentType` is a `str` enum so the string value flows through MongoDB without migration.

**Initiate endpoint: reuse existing `/payments/initiate`**

The existing `POST /api/v1/payments/initiate` already accepts `payment_type: str` + `related_entity_id` (see `InitiatePaymentRequest` DTO and `InitiateRedsysPaymentUseCase.execute()`). Pass:

```json
{
  "club_id": "...",
  "payment_type": "seminar_oficialidad",
  "amount": <price_from_config>,
  "related_entity_id": "<seminar_id>",
  "description": "Oficialidad de seminario"
}
```

No new use case, no new endpoint, no new router — zero new backend files for initiation.

**Webhook handler: extend `ProcessRedsysWebhookUseCase`**

The webhook already dispatches post-payment actions based on `payment.payment_type`. Add a branch:

```python
# process_redsys_webhook_use_case.py — inside execute(), after payment.complete_payment()
if payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD:
    if self.seminar_repository and payment.related_entity_id:
        await self.seminar_repository.mark_as_official(payment.related_entity_id)
```

The `ProcessRedsysWebhookUseCase.__init__()` already accepts optional repositories — add `seminar_repository: Optional[SeminarRepositoryPort] = None` following the same pattern as `license_repository`, `insurance_repository`, etc.

**New port method**

```python
# src/application/ports/seminar_repository.py — add
async def mark_as_official(self, seminar_id: str) -> Seminar: ...
```

**New repository method**

```python
# mongodb_seminar_repository.py — implement
async def mark_as_official(self, seminar_id: str) -> Seminar:
    await self.collection.update_one(
        {"_id": ObjectId(seminar_id)},
        {"$set": {"is_official": True, "updated_at": datetime.utcnow()}}
    )
    return await self.find_by_id(seminar_id)
```

**Price configuration: reuse existing `PriceConfiguration` system**

The system already has `price_configurations` collection and a `PriceConfigurationRepository`. Add a new price key `seminar_oficialidad_fee`. Super admin sets it via existing price configuration UI — no new infrastructure needed.

**Dependency injection: update `get_process_redsys_webhook_use_case` in `dependencies.py`**

```python
def get_process_redsys_webhook_use_case(
    payment_repo = Depends(get_payment_repository),
    seminar_repo = Depends(get_seminar_repository),   # ADD
    redsys_service = Depends(get_redsys_service),
    ...
):
    return ProcessRedsysWebhookUseCase(
        payment_repository=payment_repo,
        seminar_repository=seminar_repo,   # ADD
        ...
    )
```

### Frontend — What to Build

**Initiate payment: new service call**

```typescript
// seminar.service.ts — new function
export const initiateOficialidadPayment = async (
  seminarId: string,
  clubId: string,
  amount: number
): Promise<InitiatePaymentResponse> => {
  return await apiClient.post('/api/v1/payments/initiate', {
    club_id: clubId,
    payment_type: 'seminar_oficialidad',
    amount,
    related_entity_id: seminarId,
    description: 'Oficialidad de seminario',
  });
};
```

**Frontend payment redirect: reuse existing payment page flow**

The existing payment success/failure pages at `/payment/success` and `/payment/failure` already handle Redsys redirects for all payment types. No new page needed.

**Official badge: conditional UI**

```tsx
// In seminar card and detail: show badge when is_official === true
{seminar.is_official && (
  <Badge variant="official">
    <img src="/spain-aikikai-logo.png" alt="Oficial" />
    Seminario Oficial
  </Badge>
)}
```

---

## Alternatives Considered

### File Storage

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Local disk + StaticFiles | Cloudinary / S3 | Adds external dependency and cost. Deployment is self-hosted Dokploy. Existing PDFs and license images use local disk — consistency wins. Viable as v2 if storage grows |
| Local disk + StaticFiles | Base64 in MongoDB | Anti-pattern for anything over ~16KB. MongoDB 16MB document limit is a real risk. Makes image serving require a DB query. Pillow output JPEG at 85% quality for 1200x800 is ~150-400KB — too large for MongoDB documents |
| Separate `POST /{id}/cover-image` | Patch `PUT /{id}` with multipart | FastAPI cannot mix JSON body + file in same request cleanly without declaring all fields as `Form()`. Existing update endpoint is pure JSON; keeping separation avoids rewriting it |

### Oficialidad Payment

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Extend `ProcessRedsysWebhookUseCase` with new branch | New dedicated `ProcessOficialidadWebhookUseCase` | Both webhooks arrive at the same endpoint. Cannot route by payment_type before parsing — signature verification must happen first. The existing use case already handles dispatch; adding a branch is less complex than a new use case that duplicates sig verification logic |
| Reuse `POST /payments/initiate` | New `POST /seminars/{id}/pay-oficialidad` | Existing endpoint already handles generic payments with `payment_type` + `related_entity_id`. No benefit to a new endpoint — adds router + DTO + use case for no additional behavior |
| New `PaymentType.SEMINAR_OFICIALIDAD` | Reuse `PaymentType.SEMINAR` | `SEMINAR` is used for seminar registration payments (different flow). Using the same type would require inspecting `related_entity_id` to distinguish handling in the webhook — ambiguous and fragile |

### Image Processing

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Pillow `image.verify()` + magic bytes | Trust `Content-Type` header | Content-Type is client-controlled and easily spoofed. Pillow verify reads actual file bytes — the only reliable check |
| Save as JPEG at 85% quality | Keep original format | JPEG at q=85 compresses well for photos. Consistent output format simplifies frontend `<img>` handling. Original PNGs from screenshots can be 10x larger |
| `image.thumbnail((1200, 800))` | No resize | Without a size cap, users can upload 20MB+ raw photos. Thumbnail constrains in-place without upscaling, consistent with Pillow best practices |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `content_type` from `UploadFile.content_type` for security validation | It is the `Content-Type` header the client sent — trivially spoofed. A malicious user can upload a PHP/shell script with `image/jpeg` header | `PIL.Image.open().verify()` on the actual bytes — Pillow reads the file signature |
| Storing `cover_image_url` as a full absolute URL in the DB (e.g., `https://api.example.com/uploads/...`) | Breaks when backend URL changes or in dev/prod environments | Store relative path `/uploads/seminars/{filename}`. Frontend constructs full URL by prepending `VITE_API_URL` when rendering `<img>` |
| `image.save()` before `image.verify()` | `verify()` is destructive to the file object — calling it after reopen detects corrupt files before writing to disk | Always: `verify()` first (raises on bad file), then `Image.open()` again to get a fresh object, then `thumbnail()` + `save()` |
| Adding `aiofiles` to async disk writes in the upload handler | Adds a dependency for marginal benefit. Image processing in Pillow is already CPU-bound sync. Use a thread pool via `asyncio.to_thread()` if blocking is a concern | `asyncio.to_thread(save_image, ...)` wraps the sync Pillow call without a new dependency |
| Separate `is_official` webhook endpoint | Redsys sends all notifications to a single `DS_MERCHANT_MERCHANTURL`. There is no per-payment-type routing at the Redsys gateway level | Dispatch inside `ProcessRedsysWebhookUseCase` based on `payment.payment_type` |

---

## Domain Model Changes Summary

### Backend changes by layer

| Layer | File | Change |
|-------|------|--------|
| Domain entity | `seminar.py` | Add `cover_image_url: Optional[str]`, `is_official: bool = False`, `mark_as_official()` method |
| Domain entity | `payment.py` | Add `SEMINAR_OFICIALIDAD = "seminar_oficialidad"` to `PaymentType` enum |
| Application port | `seminar_repository.py` | Add `mark_as_official(seminar_id: str) -> Seminar` abstract method |
| Application use case | `process_redsys_webhook_use_case.py` | Add `seminar_repository` optional param; add `SEMINAR_OFICIALIDAD` branch in `execute()` |
| Infrastructure service | `seminar_image_service.py` | **New file** — wraps Pillow: validate, resize, save to disk, return URL |
| Infrastructure repository | `mongodb_seminar_repository.py` | Add `cover_image_url`, `is_official` to doc mapping; implement `mark_as_official()` |
| Infrastructure web DTO | `seminar_dto.py` | Add `cover_image_url`, `is_official` to `SeminarResponse` |
| Infrastructure web mapper | `mappers_seminar.py` | Map both new fields |
| Infrastructure web router | `seminars.py` | Add `POST /{seminar_id}/cover-image` endpoint |
| Infrastructure web dependencies | `dependencies.py` | Add `get_seminar_image_service`; inject `seminar_repository` into `get_process_redsys_webhook_use_case` |
| App factory | `app.py` | Add `app.mount("/uploads", StaticFiles(directory=uploads_dir))` |

### Frontend changes by layer

| Layer | File | Change |
|-------|------|--------|
| Schema | `seminar.schema.ts` | Add `cover_image_url?: string`, `is_official: boolean` |
| Service | `seminar.service.ts` | Add `uploadSeminarCoverImage()`, `initiateOficialidadPayment()` |
| Mutation | `useSeminarMutations.ts` | Add `useUploadCoverImageMutation`, `useInitiateOficialidadPaymentMutation` |
| Components | seminar form + card + detail | Image upload input; official badge; "Pagar Oficialidad" button |

---

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| `fastapi.staticfiles.StaticFiles` | included in FastAPI 0.115.6 | Ships with `starlette`. No separate install |
| `aiofiles` | check `pyproject.toml` | `StaticFiles` uses it for async file serving. If not present: `poetry add aiofiles`. Likely already transitive dep of FastAPI |
| `python-multipart` | 0.0.20 | Already installed — `UploadFile` depends on it |
| `Pillow` | 12.1.0 | Already installed — `Image.verify()` available since Pillow 2.x |
| Axios `FormData` | 1.10.0 | Node.js `FormData` global is available in modern browsers and Node 18+. No polyfill needed |

---

## Sources

- [FastAPI UploadFile reference](https://fastapi.tiangolo.com/reference/uploadfile/) — UploadFile class, python-multipart requirement (HIGH confidence, official docs)
- [FastAPI Static Files tutorial](https://fastapi.tiangolo.com/tutorial/static-files/) — `app.mount()` + `StaticFiles` usage (HIGH confidence, official docs)
- [FastAPI file uploads guide — Better Stack 2025](https://betterstack.com/community/guides/scaling-python/uploading-files-using-fastapi/) — Security patterns, magic bytes validation, avoid Content-Type trust (MEDIUM confidence, verified against official docs)
- [FastAPI image optimization — Medium 2025](https://medium.com/@sizanmahmud08/fastapi-image-optimization-a-complete-guide-to-faster-and-smarter-file-handling-38705e5a7b3c) — Pillow + BytesIO + BackgroundTasks pattern (MEDIUM confidence, single source)
- Codebase analysis — `license_image_service.py`, `payments.py`, `process_redsys_webhook_use_case.py`, `payment.py` (HIGH confidence, direct source inspection)

---

*Stack research for: Spain Aikikai Admin — seminar cover image upload + oficialidad payment*
*Researched: 2026-02-27*
