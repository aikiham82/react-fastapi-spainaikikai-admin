# Pitfalls Research

**Domain:** FastAPI file upload + Redsys payment webhook → automatic state change
**Researched:** 2026-02-27
**Confidence:** HIGH (based on direct codebase analysis + verified web sources)

---

## Critical Pitfalls

### Pitfall 1: MIME Type Spoofing on Cover Image Upload

**What goes wrong:**
An attacker uploads a PHP/Python script renamed as `cover.jpg`. FastAPI reads `Content-Type: image/jpeg` from the HTTP header — which the client sets — and passes it through. The file is saved to disk. If the upload directory is reachable via a web path, the server may execute the script instead of serving a static image.

**Why it happens:**
Developers trust `UploadFile.content_type`, which reflects the `Content-Type` header the browser sends. The browser determines this from file extension on the client side. Both the extension and the header are trivially spoofed. This is a classic "content-type bypass" class of vulnerability.

**How to avoid:**
1. Never use `UploadFile.content_type` for security decisions.
2. Read the first 16 bytes of the file and inspect the magic bytes:
   ```python
   ALLOWED_MAGIC = {
       b'\xff\xd8\xff': 'image/jpeg',   # JPEG
       b'\x89PNG\r\n\x1a\n': 'image/png',  # PNG
       b'RIFF': 'image/webp',           # WebP (check bytes 8-12 for WEBP)
   }
   contents = await file.read(16)
   await file.seek(0)
   if not any(contents.startswith(sig) for sig in ALLOWED_MAGIC):
       raise HTTPException(status_code=400, detail="File must be a JPEG, PNG, or WebP image")
   ```
3. Alternatively (and more robustly) use `python-magic` (`python-magic-bin` on Windows) which wraps libmagic:
   ```python
   import magic
   mime = magic.from_buffer(await file.read(2048), mime=True)
   await file.seek(0)
   if mime not in ('image/jpeg', 'image/png', 'image/webp'):
       raise HTTPException(status_code=400, detail="Invalid file type")
   ```
4. Use Pillow (already available in this project) as an additional validation layer: try to `Image.open()` the file in a try/except — if Pillow cannot parse it as an image, reject it.

**Warning signs:**
- Upload endpoint accepts `UploadFile` but only checks `file.content_type`
- No call to `file.read()` + magic bytes inspection before saving
- Upload directory is the same path served as static files

**Phase to address:** Phase 1 — Seminar Cover Image Upload (must be built in before first file hits disk)

---

### Pitfall 2: Path Traversal via Filename

**What goes wrong:**
A user uploads a file named `../../backend/src/config/settings.py`. The server naively constructs the save path as `UPLOAD_DIR / file.filename` and overwrites a source file. With a crafted filename like `../../../etc/passwd` (on Linux), the attacker can write to arbitrary locations the server process has write access to.

**Why it happens:**
`UploadFile.filename` comes from the multipart `Content-Disposition` header and is fully attacker-controlled. Using it directly in `Path` construction without sanitization is the mistake.

**How to avoid:**
Never use `file.filename` to construct disk paths. Always generate a UUID-based filename:
```python
import uuid
from pathlib import Path

ext = Path(file.filename or "").suffix.lower()  # preserve extension for serving
if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
    raise HTTPException(status_code=400, detail="Invalid extension")
safe_filename = f"{uuid.uuid4().hex}{ext}"
dest = UPLOAD_DIR / safe_filename
```
The original filename can be stored in MongoDB as metadata if needed for display, but must never be used in disk I/O.

**Warning signs:**
- Code contains `UPLOAD_DIR / file.filename` or `os.path.join(upload_dir, filename)`
- No UUID generation before saving
- Filename from request used in any `open()` call

**Phase to address:** Phase 1 — Seminar Cover Image Upload

---

### Pitfall 3: Webhook Idempotency — Duplicate Seminar Status Change

**What goes wrong:**
Redsys may deliver the same webhook notification more than once (network retries, server restarts, their internal retry logic). The current `ProcessRedsysWebhookUseCase` has no idempotency check — it looks up payment by `transaction_id` and processes unconditionally. For the new "oficialidad" flow, a duplicate webhook call would:
1. Find the already-COMPLETED payment
2. Try to call `payment.complete_payment()` again → raises `ValueError("Only processing payments can be completed")` because status is already COMPLETED
3. The `except Exception` in the router returns HTTP 200 to Redsys (correct) but the seminar status-change side-effect may have already executed OR may be skipped depending on execution order

**Why it happens:**
The existing webhook handler has partial protection: `complete_payment()` raises on non-PROCESSING status, which acts as an implicit idempotency guard for payment status. But any code that runs *before* `complete_payment()` in the new "oficialidad" flow (e.g., looking up the seminar and calling `seminar.mark_as_official()`) could execute again if the check is positioned incorrectly.

The correct guard is an explicit early exit:
```python
# At the top of execute(), after finding the payment:
if payment.status == PaymentStatus.COMPLETED:
    # Already processed — return the existing result without re-executing side effects
    return WebhookProcessResult(payment=payment, success=True, message="Already processed")
```

**How to avoid:**
1. Add an early-exit idempotency check in `ProcessRedsysWebhookUseCase.execute()` before any state changes.
2. For the seminar status change specifically, check `seminar.is_official` (or equivalent flag) before marking it official again.
3. Use a MongoDB unique index on `payment.transaction_id` to make double-creation impossible at the DB layer.
4. The existing `CONCERNS.md` already flags this: "Webhook Idempotency: Problem: Redsys webhook handler doesn't check if payment already processed."

**Warning signs:**
- `process_redsys_webhook_use_case.py` has no `if payment.status == PaymentStatus.COMPLETED: return` guard
- `Seminar.mark_as_official()` method (once added) is called inside the webhook without checking current status
- No unique DB index on `payments.transaction_id`

**Phase to address:** Phase 2 — Oficialidad Payment Flow (build idempotency before any production traffic)

---

### Pitfall 4: Race Condition — Double Payment Creates Two "Oficial" Seminars

**What goes wrong:**
Two concurrent Redsys webhook deliveries arrive simultaneously (Redsys occasionally sends parallel retries). Both pass the signature check. Both find `payment.status == PROCESSING`. Both call `complete_payment()` and then set `seminar.is_official = True`. The result: two invoice records, two status-change operations, and a seminar that appears marked official twice in the DB update log.

**Why it happens:**
MongoDB document updates without atomic compare-and-swap are not safe under concurrent writes. The sequence read→modify→write on the `payment` document is non-atomic.

**How to avoid:**
Use MongoDB's atomic `findOneAndUpdate` with a filter that only matches the expected state:
```python
# In the repository, use a conditional update:
result = await collection.find_one_and_update(
    {"_id": ObjectId(payment_id), "status": "processing"},  # guard condition
    {"$set": {"status": "completed", "transaction_id": order_id}},
    return_document=True
)
if result is None:
    # Another worker already completed this payment — idempotent exit
    return existing_payment
```
This replaces the read→check→write pattern with an atomic operation. If two concurrent workers race, only one wins; the other gets `None` and exits cleanly.

**Warning signs:**
- Repository `update()` method does `find_one` + `replace_one` as two separate operations
- No `$set` filter on current status in the payment update query
- `mongodb_payment_repository.py` update method does not use conditional filters

**Phase to address:** Phase 2 — Oficialidad Payment Flow (implement before connecting webhook → seminar state change)

---

### Pitfall 5: File Size Not Enforced — Disk Exhaustion

**What goes wrong:**
A club admin (or an attacker with a valid session) uploads a 2GB "image" file. The async file handler streams it to disk without checking size in flight. The server's disk fills up, crashing the entire backend including MongoDB writes.

**Why it happens:**
FastAPI's `UploadFile` is a lazy streaming wrapper. It does not read the entire file into memory (good for performance) but also does not enforce a maximum size unless the developer explicitly does so. The `Content-Length` header can also be omitted or spoofed by clients.

**How to avoid:**
Enforce size limits in two places:
1. **Nginx/Dokploy layer:** Set `client_max_body_size 5M;` (or appropriate limit) in the proxy config. This blocks oversized requests before they reach FastAPI.
2. **Application layer** (defense in depth): Stream the file and count bytes:
   ```python
   MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
   contents = b""
   async for chunk in file.chunks():
       contents += chunk
       if len(contents) > MAX_SIZE_BYTES:
           raise HTTPException(status_code=413, detail="File too large (max 5MB)")
   ```
   Or use a middleware approach with `Request.body()` size checks.

**Warning signs:**
- Upload endpoint uses `await file.read()` with no size check
- No `client_max_body_size` set in nginx/proxy config
- No `Content-Length` validation before reading

**Phase to address:** Phase 1 — Seminar Cover Image Upload

---

### Pitfall 6: Static File Serving Leaks Files from Other Features

**What goes wrong:**
The upload directory for seminar covers is mounted as a static route with broad path access: `app.mount("/uploads", StaticFiles(directory="uploads"))`. This serves ALL files in that directory tree. If invoice PDFs, license templates, or other sensitive files are stored in a parent or sibling directory, a traversal in the URL may expose them.

The existing codebase stores invoice PDFs in `INVOICE_OUTPUT_DIR` (env var). If that resolves to a path inside the mounted static directory, all invoices become publicly accessible by URL.

**Why it happens:**
`StaticFiles` in FastAPI/Starlette serves any file within the mounted directory without authentication. Developers assume only uploaded images will land there but do not enforce directory isolation.

**How to avoid:**
1. Create a dedicated, isolated upload directory for seminar covers: `uploads/seminar_covers/` — separate from invoice and other file storage.
2. Do NOT mount `StaticFiles` for the seminar covers directory. Instead, serve cover images through an authenticated endpoint:
   ```python
   @router.get("/{seminar_id}/cover")
   async def get_seminar_cover(seminar_id: str, ctx: AuthContext = Depends(get_auth_context)):
       seminar = await get_seminar_use_case.execute(seminar_id)
       if not seminar.cover_image_path:
           raise HTTPException(status_code=404)
       return FileResponse(seminar.cover_image_path, media_type="image/jpeg")
   ```
3. If public access is intentional (seminar listing is public), ensure the static mount only covers the specific subdirectory and is completely isolated.

**Warning signs:**
- `StaticFiles` mounted at a path that shares a parent directory with invoice PDF output
- `INVOICE_OUTPUT_DIR` and image upload dir are both under `/uploads/`
- No auth check on the image-serving route

**Phase to address:** Phase 1 — Seminar Cover Image Upload

---

### Pitfall 7: Payment Type Routing — Webhook Cannot Distinguish Oficialidad from License

**What goes wrong:**
The existing `ProcessRedsysWebhookUseCase` identifies what to do after payment by reading `payment.payment_type`. The current `PaymentType` enum has `SEMINAR = "seminar"` but no `SEMINAR_OFICIALIDAD` variant. If a generic `SEMINAR` type is used for the oficialidad payment, the webhook cannot distinguish "pay for seminar attendance" from "pay to make a seminar official" — both would trigger the same post-payment logic.

**Why it happens:**
Adding a new payment flow without extending the discriminator field. The webhook handler uses `payment_type` and `related_entity_id` to decide what downstream action to take. Without a new type, the handler either does nothing (seminar stays unofficial) or executes incorrect downstream logic.

**How to avoid:**
Add `SEMINAR_OFICIALIDAD = "seminar_oficialidad"` to the `PaymentType` enum and add a corresponding branch in `ProcessRedsysWebhookUseCase.execute()`:
```python
elif payment.payment_type == PaymentType.SEMINAR_OFICIALIDAD:
    seminar_id = payment.related_entity_id
    await self._mark_seminar_as_oficial(seminar_id)
```
The `related_entity_id` field (already exists on `Payment`) is used to store the `seminar_id`.

**Warning signs:**
- New payment initiation for oficialidad uses `PaymentType.SEMINAR` without a new enum value
- Webhook handler has no `elif payment_type == PaymentType.SEMINAR_OFICIALIDAD` branch
- Post-payment seminar update is implemented in the router (wrong layer) rather than the webhook use case

**Phase to address:** Phase 2 — Oficialidad Payment Flow (must be designed before implementing the initiate endpoint)

---

### Pitfall 8: Seminar "Oficial" State Added as Boolean Field Causes Schema Drift

**What goes wrong:**
The `Seminar` entity and MongoDB collection gain a new `is_oficial: bool = False` field. Existing seminar documents in MongoDB have no such field. MongoDB reads return `None` for missing fields, and Python `@dataclass` defaults may or may not handle this correctly depending on how the mapper deserializes. The result: existing seminars all appear "unofficial" (correct), but if the field is not explicitly defaulted to `False` in the mapper, older documents may cause `AttributeError` or validation failures in Pydantic DTOs.

**Why it happens:**
MongoDB is schemaless — adding a field to Python code does not backfill existing documents. The mismatch between "field exists in new code" and "field absent in old documents" is a silent failure mode.

**How to avoid:**
1. Use `Optional[bool] = False` in the dataclass (not just `bool`).
2. In `mongodb_seminar_repository.py`, use `.get("is_oficial", False)` when deserializing, never `["is_oficial"]`.
3. Run a one-time migration script to backfill: `db.seminars.update_many({"is_oficial": {"$exists": False}}, {"$set": {"is_oficial": false}})`.
4. Add a test that creates a seminar document WITHOUT the new field and asserts the mapper returns `is_oficial=False`.

**Warning signs:**
- Mapper uses `doc["is_oficial"]` (bracket access) instead of `doc.get("is_oficial", False)`
- No migration script for existing documents
- No test for old-schema document deserialization

**Phase to address:** Phase 1 (domain entity change) and Phase 2 (migration)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store image on local filesystem (not S3/cloud) | No external dependency, simpler setup | Files lost on server replacement or scaling to multiple dynos; no CDN | Acceptable for this scale (single-server Dokploy deploy) — document the limitation |
| Trust `UploadFile.content_type` without magic-byte check | Faster to implement | Critical security vulnerability (MIME spoofing) | Never acceptable |
| Serve cover images via `StaticFiles` mount (unauthenticated) | Zero code for serving | Exposes upload directory; no access control | Acceptable ONLY if images are genuinely public and directory is completely isolated |
| Skip idempotency check in webhook handler | Simpler code | Duplicate invoice + duplicate seminar-official marking on retry | Never acceptable for payment webhooks |
| Add `is_oficial` to `Seminar` as a bare `bool` field without migration | Faster | `KeyError` on existing documents in production | Never acceptable without a `.get()` default in the mapper |
| Store `seminar_id` in `Payment.related_entity_id` (reusing existing field) | No schema change | Field name is semantically wrong (`related_entity_id` was for `license_id`); causes confusion in queries | Acceptable short-term if well-documented |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Redsys webhook | Assuming webhook fires exactly once after payment | Implement idempotency check (payment.status == COMPLETED → early return) before any state mutation |
| Redsys webhook | Returning HTTP 4xx/5xx on processing errors | Always return HTTP 200 to Redsys; errors should be logged internally, not communicated via HTTP status |
| Redsys webhook | No authentication on webhook endpoint (intentional) | Security is via HMAC-SHA256 signature verification only — ensure `verify_notification_signature` is called FIRST, before any DB lookup |
| FastAPI `UploadFile` | Reading entire file with `await file.read()` before size check | Stream in chunks and enforce byte limit incrementally |
| FastAPI `StaticFiles` | Mounting parent upload directory | Mount only the specific subdirectory for seminar covers; keep invoice PDFs in a separate, non-mounted path |
| Motor + MongoDB | Using two separate `find_one` + `update` for payment completion | Use `find_one_and_update` with a status filter for atomic compare-and-swap |
| Pillow image processing | `Image.open()` on untrusted data without size limits | Set `Image.MAX_IMAGE_PIXELS = 10_000_000` before opening to prevent "decompression bomb" DoS |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full image into memory with `await file.read()` for large files | High memory spike per upload, OOM under concurrent uploads | Stream file in chunks; use `shutil.copyfileobj` or `async for chunk in file.chunks()` | At ~5 concurrent 10MB uploads on a 512MB server |
| Serving images via Python route instead of nginx for every list page load | Each seminar card triggers an authenticated API call to fetch its cover; list of 50 seminars = 50 image requests through FastAPI | Serve via nginx static or generate signed URLs; cache `Cache-Control: max-age=3600` headers | At 20+ simultaneous users viewing the seminar list |
| Pillow image re-processing on every serve request | CPU spike on each image fetch | Process once on upload (resize/optimize), store result; serve the processed file | At 10+ concurrent requests to the same image endpoint |
| Calling `payment_repository.find_by_transaction_id()` in webhook without index | Full collection scan on every webhook | Ensure MongoDB index on `payments.transaction_id` exists | At 1000+ payment documents |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `UploadFile.filename` directly in disk path | Path traversal — attacker overwrites arbitrary server files | Always generate UUID filename; store original name only in DB metadata |
| Trusting `UploadFile.content_type` for MIME validation | MIME spoofing — malicious script saved as image | Validate via magic bytes (first 16 bytes) or `python-magic`/Pillow parse attempt |
| Mounting upload directory as `StaticFiles` with no scope isolation | Exposes invoice PDFs and license images if directories overlap | Use separate isolated directories; serve via authenticated endpoint or strictly scoped static mount |
| Not enforcing file size limit in application layer | Disk exhaustion DoS attack | Enforce in nginx (`client_max_body_size`) AND in application (stream + byte counter) |
| Pillow `Image.open()` without decompression bomb protection | A crafted PNG/JPEG can decompress to gigabytes, causing OOM | Set `Image.MAX_IMAGE_PIXELS` before opening untrusted images |
| Serving `cover_image_path` from DB directly as filesystem path in `FileResponse` | If `cover_image_path` is corrupted or injected via DB, attacker reads arbitrary files | Validate the resolved path starts with `UPLOAD_DIR` before serving: `assert str(path.resolve()).startswith(str(UPLOAD_DIR))` |
| Webhook endpoint reachable from internal network without signature check | Internal services could trigger false payment completions | Signature check must be the first operation in the webhook handler, before any DB access |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No upload progress indicator for cover image | Admin uploads 3MB image, sees nothing for 3 seconds, clicks again, creates duplicate request | Use `XMLHttpRequest` with progress events, or React Query `onUploadProgress` via axios; disable upload button while in flight |
| Payment redirect to Redsys opens in same tab; back button brings user to stale form | Club admin hits back after payment, sees old form, re-submits, gets 409 Conflict or worse a new payment | Use `window.open()` or detect return from Redsys via URL param and immediately refresh seminar status |
| Seminar card shows "oficialidad" badge immediately after redirect back from Redsys, before webhook fires | Badge appears, then disappears when React Query refetches and finds seminar still unofficial | Do NOT show badge based on Redsys redirect URL params — only show after polling/refetching seminar status from API; webhook processing may take 1-3 seconds |
| No feedback when cover image is replaced (old image not visually cleared) | Admin uploads new image, old one still visible due to browser caching | Use UUID filenames (no cache collision) + invalidate React Query cache for the seminar after upload; force image `key` change in React |
| Upload button available even if seminar is cancelled | Wasted storage; confusing UX | Disable upload if `seminar.status === 'cancelled'` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cover image upload:** Endpoint accepts file — verify magic-byte validation AND UUID filename generation AND size limit are all present, not just the multipart form handler
- [ ] **Cover image serving:** Image displays in browser — verify the served path is validated against `UPLOAD_DIR` to prevent path traversal in serve direction
- [ ] **Oficialidad payment initiation:** Form submits and redirects to Redsys — verify `PaymentType.SEMINAR_OFICIALIDAD` is a distinct enum value and `seminar_id` is stored in `related_entity_id`
- [ ] **Webhook marks seminar official:** Seminar shows official after payment — verify the idempotency check is present (early return if `payment.status == COMPLETED`) and the seminar is checked for already-official state
- [ ] **Duplicate webhook safety:** Happy path works — send identical webhook payload twice; verify second call is a no-op with no duplicate DB writes
- [ ] **Old seminar documents:** New `is_oficial` field displays correctly — create a test seminar document in DB WITHOUT the field; verify mapper returns `False` not `KeyError`
- [ ] **Price from config:** Oficialidad price shows correctly — verify price is read from `price_configurations` collection, not hardcoded; verify super admin can change it and next payment uses the new value

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| MIME spoofing exploit — malicious file on disk | HIGH | Audit all files in upload dir with `file --mime-type *`; delete non-image files; add magic-byte check retroactively; review server logs for execution attempts |
| Path traversal — source file overwritten | CRITICAL | Restore from git; review what was overwritten; rotate all secrets if `settings.py` or `.env` was targeted; patch endpoint immediately |
| Duplicate webhook — seminar marked official twice, double invoice | MEDIUM | Identify duplicate invoice numbers in DB; delete one; verify seminar `is_oficial` is still `true`; add idempotency check before next deploy |
| Race condition — two invoices created for one payment | MEDIUM | Query `invoices` for duplicate `payment_id`; void/delete the duplicate; implement atomic `find_one_and_update` before re-enabling payments |
| Disk exhaustion from large uploads | HIGH | Clear temp files; restart services; add nginx `client_max_body_size` immediately; enforce app-layer size check; consider adding size limit migration to existing files |
| Old seminar documents failing deserialization | LOW | Run migration: `db.seminars.update_many({is_oficial: {$exists: false}}, {$set: {is_oficial: false}})`; deploy hotfix using `.get()` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| MIME type spoofing | Phase 1: Cover Image Upload | Unit test: upload a text file with `.jpg` extension; assert 400 response |
| Path traversal via filename | Phase 1: Cover Image Upload | Unit test: upload with filename `../../etc/passwd`; assert saved file uses UUID name in correct dir |
| File size not enforced | Phase 1: Cover Image Upload | Integration test: upload 10MB file; assert 413 response |
| Static file serving leaks other files | Phase 1: Cover Image Upload | Manual check: `INVOICE_OUTPUT_DIR` is not inside the static-served upload path |
| Webhook idempotency (duplicate) | Phase 2: Oficialidad Payment Flow | Integration test: POST identical webhook payload twice; assert seminar.is_oficial toggled only once, invoice count = 1 |
| Race condition (concurrent webhooks) | Phase 2: Oficialidad Payment Flow | Integration test with concurrent async tasks; assert DB has exactly one completed payment record |
| Payment type routing confusion | Phase 2: Oficialidad Payment Flow | Unit test: webhook with `PaymentType.SEMINAR_OFICIALIDAD` triggers `_mark_seminar_as_oficial`; `PaymentType.SEMINAR` does not |
| Schema drift on existing seminar documents | Phase 1 (entity) + Phase 2 (migration) | Unit test: deserialize seminar doc without `is_oficial` field; assert `is_oficial == False` |
| Pillow decompression bomb | Phase 1: Cover Image Upload | Add `Image.MAX_IMAGE_PIXELS = 10_000_000` before opening; test with crafted image or mock |

---

## Sources

- Codebase direct analysis: `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` (CONCERNS.md flags idempotency gap at line 234-237)
- Codebase direct analysis: `backend/src/infrastructure/web/routers/payments.py` (webhook returns HTTP 200 on all exceptions — correct pattern)
- Codebase direct analysis: `backend/src/domain/entities/seminar.py` (no `is_oficial` field exists yet; `SeminarStatus` enum has no OFICIAL value)
- Codebase direct analysis: `backend/src/domain/entities/payment.py` (`PaymentType.SEMINAR` exists but no `SEMINAR_OFICIALIDAD`)
- Codebase direct analysis: `.planning/codebase/CONCERNS.md` — "Webhook Idempotency" section explicitly flags the missing check
- FastAPI file upload security: [Uploading Files Using FastAPI — Better Stack](https://betterstack.com/community/guides/scaling-python/uploading-files-using-fastapi/)
- MIME type bypass vulnerabilities: [File Upload Content Type and MIME Type Bypass — Sourcery](https://www.sourcery.ai/vulnerabilities/file-upload-content-type-bypass/)
- Webhook idempotency patterns: [How to Implement Webhook Idempotency — Hookdeck](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- FastAPI file upload patterns: [How to Handle File Uploads with Python and FastAPI — ionx](https://blog.ionxsolutions.com/p/file-uploads-with-python-fastapi/)

---
*Pitfalls research for: Spain Aikikai Admin — seminar cover image upload + oficialidad payment flow*
*Researched: 2026-02-27*
