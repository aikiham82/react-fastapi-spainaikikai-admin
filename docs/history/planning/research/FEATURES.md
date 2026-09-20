# Feature Research

**Domain:** Admin backoffice — seminar cover image upload + oficialidad payment flow
**Researched:** 2026-02-27
**Confidence:** HIGH (based on existing codebase analysis + established UX patterns for file upload and payment flows)

---

## Context: What Already Exists

The codebase has a fully working seminar feature (entity, CRUD use cases, MongoDB repository, React grid UI with cards) and a fully working Redsys payment integration (RedsysService, InitiateRedsysPaymentUseCase, ProcessRedsysWebhookUseCase, payment-success and payment-failure pages). The two new features slot into these existing foundations — they do not require new infrastructure, only extensions.

The seminar card UI (`SeminarList.tsx`) is a CSS grid with cards. Each card shows title, status badge, date, location, instructor, participant count, and price. This is where the cover image and oficialidad seal will appear.

The `SeminarForm.tsx` is a Dialog with controlled fields. This is where the image upload control will be added.

The `PriceConfiguration` entity has a `category` field with valid values `{"license", "insurance", "club_fee"}`. A new `"seminar_oficialidad"` category (or key) needs to be added, or the existing `club_fee` category can be reused with a specific key — adding a new category is cleaner and consistent.

---

## Feature Landscape

### Table Stakes (Users Expect These)

#### Feature Set A: Cover Image Upload

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Image upload control in seminar form | Any modern content form has a file picker for cover photos | LOW | Add to existing SeminarForm Dialog; use `<input type="file">` styled as a dropzone area |
| Preview of selected image before saving | Users need to confirm they picked the right file | LOW | `URL.createObjectURL()` client-side, no server round-trip needed for preview |
| Display image in seminar card (list view) | If a card has an image, it must show it — otherwise users wonder why they uploaded | LOW | Replace the blank top area of the card with a fixed-height image container |
| Display image in seminar detail dialog | Detail view must show the full cover | LOW | Already a `DialogContent` showing seminar fields; add `<img>` at top |
| Graceful fallback when no image | Cards without images must not look broken | LOW | Placeholder with Calendar icon (already exists in empty state — reuse pattern) |
| File size limit enforced client-side | Prevents accidental upload of 20MB RAW photos | LOW | 2MB or 5MB limit; show error before network request |
| Backend stores the file and returns a URL | Frontend needs a stable URL to render the image | MEDIUM | FastAPI `UploadFile`, save to disk under `/static/uploads/seminars/`, return URL in SeminarResponse |
| Delete/replace image | If admin uploads wrong image, they must be able to fix it | LOW | Re-uploading replaces; optionally a "remove image" button |

#### Feature Set B: Oficialidad Payment Flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "Solicitar Oficialidad" button on seminar card/detail | Entry point must be discoverable — club admin must know the option exists | LOW | Show button only when: user is club_admin AND seminar belongs to their club AND seminar is NOT already official |
| Price displayed before initiating payment | Users must know what they will pay before being sent to Redsys | LOW | Fetch `PriceConfiguration` for oficialidad key; display prominently in a confirmation dialog |
| Confirmation dialog before redirect to Redsys | Prevents accidental payment initiation | LOW | "Vas a pagar X€ para oficializar este seminario. ¿Confirmar?" with Cancel/Confirmar buttons |
| Redsys redirect (existing flow) | Payment must go through Redsys — already the only gateway | MEDIUM | Reuse `InitiateRedsysPaymentUseCase` with a new `payment_type = "seminar_oficialidad"` and `related_entity_id = seminar_id` |
| Webhook auto-marks seminar as official | After payment confirmed by Redsys, seminar.is_official must flip to true automatically — no manual step | MEDIUM | Extend `ProcessRedsysWebhookUseCase` to handle the new payment_type; update seminar in the same transaction |
| Oficialidad seal/badge visible on card immediately after payment | The visual payoff must be immediate — admin refreshes and sees the seal | LOW | New Badge component or overlay on card image; use Spain Aikikai logo from existing `backend/src/infrastructure/web/assets/` |
| Seal visible in detail dialog | Same seal must appear in the "Ver Detalles" dialog | LOW | One-liner addition to the existing dialog |
| Super admin can configure the oficialidad price | Already an established pattern (PriceConfiguration entity) — super admin expects to control all prices from one place | LOW | Add new price config key `seminar_oficialidad` using the existing price-configurations UI |
| Payment-success page context-aware | After paying for oficialidad, the success page must not say "Tu licencia será activada" | LOW | Pass a `context` query param (e.g. `?context=seminar_oficialidad`) so the success page shows the right message |

---

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Spain Aikikai seal as image overlay on the cover photo | The seal appears ON the cover photo (corner badge), making official seminars visually stunning vs unofficial ones | MEDIUM | CSS position:absolute overlay on the card image; no backend processing needed |
| Oficialidad fee visible in seminar card footer before payment | Club admins can plan budget by seeing the price without clicking into the flow | LOW | Fetch the price config once and show it as a small hint: "Oficializar: X€" |
| Email notification to club admin after oficialidad confirmed | Club admin gets confirmation outside the browser, useful if they close the tab | MEDIUM | Extend existing email scheduler/notification system |

---

### Anti-Features (Deliberately NOT Building in v1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manual approval of oficialidad by super admin | Seemed like a governance step | Adds latency, requires super admin availability, creates support burden ("why hasn't my seminar been approved?") — PROJECT.md already decided against this | Automatic on payment: Redsys webhook sets is_official = true |
| Gallery of multiple photos per seminar | "More photos = richer content" | Multiplies upload complexity (ordering, deletion, storage), out of scope per PROJECT.md | Single cover image only; v2 consideration |
| Revocation of oficialidad | "What if a club misbehaves?" | Not specified, adds complex refund/reversal flow with Redsys | Not built; super admin can handle edge cases directly in DB if needed |
| Image cropping/editing in the browser | "Users upload wrong aspect ratio" | Adds a canvas-based editor (significant JS complexity) | Enforce aspect ratio guidance in the upload UI (text hint) and use CSS object-fit to handle display; Pillow can resize server-side |
| Public-facing seminar listing page | "Members should see seminars" | This is a backoffice admin tool, not a public site; scope creep | Out of scope entirely — this system manages, it does not publish |
| Drag-and-drop reordering of seminars | "I want to pin important seminars" | No ordering concept exists in the data model | Sort by start_date (already implicit); no reorder needed |
| Image CDN / object storage (S3/Cloudflare R2) | "For scalability" | Over-engineered for a federation backoffice with dozens of seminars/year; Pillow is already available | Local disk storage under FastAPI's StaticFiles; trivially movable to S3 in v2 if needed |

---

## Feature Dependencies

```
[Oficialidad payment flow]
    └──requires──> [Seminar is_official field in domain entity + DB]
    └──requires──> [PriceConfiguration with key "seminar_oficialidad"]
    └──requires──> [InitiateRedsysPaymentUseCase] (already exists)
    └──requires──> [ProcessRedsysWebhookUseCase extended for new payment_type]
                       └──requires──> [SeminarRepository.mark_as_official()]

[Oficialidad seal display]
    └──requires──> [Seminar.is_official field exposed in SeminarResponse DTO]
    └──enhances──> [Cover image display] (seal overlays the cover photo if both exist)

[Cover image upload]
    └──requires──> [Backend file upload endpoint: POST /seminars/{id}/cover-image]
    └──requires──> [FastAPI StaticFiles mount for /static/uploads/]
    └──requires──> [Seminar.cover_image_url field in domain entity + DTO]

[Payment-success page context-aware]
    └──requires──> [Context query param passed from initiation redirect]
    └──enhances──> [Existing payment-success.page.tsx]

[Super admin price config for oficialidad]
    └──requires──> [New PriceConfiguration category or key "seminar_oficialidad"]
    └──enhances──> [Existing price-configurations UI] (no new page needed)
```

### Dependency Notes

- **Oficialidad flow requires is_official in the Seminar entity:** The domain entity currently has no `is_official` flag. This must be the first domain change. Everything else — webhook handling, badge display, button gating — depends on it.
- **Cover image and oficialidad are independent:** They can be built in parallel. The seal overlay enhancing the cover photo is a nice-to-have synergy, not a hard dependency.
- **Price config for oficialidad requires a decision on category:** Use a new `category = "seminar_oficialidad"` with key `"oficialidad"`, OR reuse `category = "club_fee"` with key `"seminar_oficialidad"`. Recommendation: add a new category — it keeps price config semantics clean and avoids filtering complexity in the existing UI.

---

## MVP Definition

### Launch With (v1)

- [ ] `Seminar.is_official: bool` field added to domain entity, MongoDB repository, DTO, and mapper — this unblocks both the seal display and the payment webhook
- [ ] `Seminar.cover_image_url: Optional[str]` field added to domain entity, MongoDB repository, DTO, and mapper
- [ ] `POST /api/v1/seminars/{id}/cover-image` endpoint — accepts `UploadFile`, validates type (jpg/png/webp) and size (max 5MB), resizes with Pillow (max 1200px wide), saves to `backend/static/uploads/seminars/`, updates seminar record, returns updated SeminarResponse
- [ ] FastAPI StaticFiles mount at `/static` so images are accessible via URL
- [ ] Cover image displayed in seminar card (top image area, fixed height ~180px, CSS object-fit: cover)
- [ ] Cover image upload control in SeminarForm (file picker + preview; only shown to club_admin / super_admin on edit)
- [ ] PriceConfiguration with category `seminar_oficialidad` and configurable price — accessible via existing price-configurations UI
- [ ] `POST /api/v1/seminars/{id}/iniciar-oficialidad` endpoint — verifies seminar belongs to auth club, fetches price config, calls `InitiateRedsysPaymentUseCase` with `payment_type="seminar_oficialidad"` and `related_entity_id=seminar.id`, returns Redsys form data
- [ ] `ProcessRedsysWebhookUseCase` extended to handle `payment_type="seminar_oficialidad"`: on successful Redsys response, call `seminar_repository.mark_as_official(seminar_id)`
- [ ] "Solicitar Oficialidad" button in seminar card/detail — visible only when: `club_admin` role AND seminar.club_id matches user's club AND `seminar.is_official == false`
- [ ] Confirmation dialog showing price before Redsys redirect
- [ ] Spain Aikikai seal badge displayed in card and detail view when `seminar.is_official == true`
- [ ] Payment-success page shows seminar-appropriate text when context param indicates oficialidad

### Add After Validation (v1.x)

- [ ] Email notification to club admin after oficialidad payment confirmed — trigger: add call to EmailService in the webhook use case after marking official; message: "Tu seminario X ha sido oficializado"
- [ ] Oficialidad price hint in seminar card footer ("Oficializar: X€") — small UX improvement, low priority

### Future Consideration (v2+)

- [ ] Photo gallery (multiple images per seminar) — only if clubs explicitly request it
- [ ] Image CDN / object storage migration — only if storage or performance becomes an issue
- [ ] Oficialidad revocation — only if federation governance requires it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `is_official` field in Seminar entity | HIGH (blocker for everything) | LOW | P1 |
| `cover_image_url` field in Seminar entity | HIGH (blocker for upload) | LOW | P1 |
| File upload endpoint + static files | HIGH | MEDIUM | P1 |
| Cover image in card UI | HIGH | LOW | P1 |
| Cover image upload in SeminarForm | HIGH | LOW | P1 |
| Price config for oficialidad | HIGH (required for flow) | LOW | P1 |
| Iniciar-oficialidad endpoint | HIGH | MEDIUM | P1 |
| Webhook handler for seminar_oficialidad | HIGH | MEDIUM | P1 |
| Oficialidad button + confirmation dialog | HIGH | LOW | P1 |
| Official seal display in card + detail | HIGH (the payoff) | LOW | P1 |
| Success page context awareness | MEDIUM | LOW | P1 |
| Email notification after oficialidad | MEDIUM | LOW | P2 |
| Price hint in card | LOW | LOW | P3 |

---

## UX Flow: Oficialidad Payment

### Happy Path (club admin perspective)

```
1. Club admin opens Seminars page
   └─ Sees seminar card with no seal (seminar is not official)

2. Admin clicks "Solicitar Oficialidad" button on the card (or in "Ver Detalles" dialog)
   └─ Confirmation Dialog opens:
      Title: "Oficializar Seminario"
      Body:  "Al pagar X€ este seminario quedará certificado por Spain Aikikai
              y mostrará el sello oficial. El pago se procesa de forma segura
              mediante Redsys."
      CTA:   [Cancelar] [Confirmar y Pagar — X€]

3. Admin clicks "Confirmar y Pagar"
   └─ Frontend calls POST /api/v1/seminars/{id}/iniciar-oficialidad
   └─ Backend creates a pending Payment record and returns Redsys form data
   └─ Frontend submits the Redsys form (POST redirect to Redsys URL)

4. Admin completes card payment on Redsys TPV page

5. Redsys sends webhook to POST /api/v1/payments/redsys/webhook
   └─ ProcessRedsysWebhookUseCase identifies payment_type = "seminar_oficialidad"
   └─ Marks Payment as completed
   └─ Calls seminar_repository.mark_as_official(seminar_id)

6. Redsys redirects admin browser to /payment-success?context=seminar_oficialidad&Ds_Order=...
   └─ Success page shows: "Seminario oficializado correctamente"
      with link back to /seminars

7. Admin returns to Seminars page
   └─ Seminar card now shows Spain Aikikai seal
   └─ "Solicitar Oficialidad" button is gone (seminar.is_official == true)
```

### Error / Edge Cases

```
Payment failure (card declined, user cancels):
   └─ Redsys redirects to /payment-failure (existing page)
   └─ Payment remains PENDING → backend scheduler or webhook marks as FAILED
   └─ seminar.is_official remains false
   └─ Admin can try again (button still visible)

Webhook arrives before browser redirect (common with Redsys):
   └─ This is the normal Redsys flow — webhook is primary, redirect is secondary
   └─ No issue: seminar marked official by webhook; success page just displays confirmation

Webhook arrives for already-official seminar (duplicate webhook):
   └─ mark_as_official() must be idempotent: if is_official already true, no-op
   └─ No double charge: Redsys order IDs are unique per payment

Admin tries to initiate oficialidad for already-official seminar:
   └─ Backend returns 409 Conflict
   └─ Button must not be shown (frontend gates on is_official), but defense-in-depth at API level

Club admin tries to pay for another club's seminar:
   └─ Backend checks auth context: seminar.club_id must match ctx.club_id
   └─ Returns 403 Forbidden

Price config missing (not set up by super admin):
   └─ Backend returns 404/422
   └─ Frontend shows error: "El precio de oficialidad no está configurado. Contacta con Spain Aikikai."

Network error during file upload:
   └─ Show error toast; seminar is unchanged (upload is a separate call from seminar update)
   └─ Admin retries upload
```

---

## UX Flow: Cover Image Upload

### Happy Path (club admin perspective)

```
1. Admin opens seminar form (edit mode — click on seminar title in card)
   └─ Form Dialog shows all existing fields
   └─ At the top: "Imagen de Portada" section
      - If no image: dashed border dropzone area with upload icon and text
        "Haz clic o arrastra una imagen (JPG, PNG, WebP, máx. 5MB)"
      - If image exists: thumbnail preview with "Cambiar imagen" button

2. Admin clicks the upload area or selects a file
   └─ Native file picker opens (accept="image/jpeg,image/png,image/webp")
   └─ On file selection:
      - Client validates size (>5MB → show error inline, do not upload)
      - Client validates type (non-image → show error inline)
      - Show preview using URL.createObjectURL()
      - Mark form as "has pending image"

3. Admin clicks "Actualizar" to save the form
   └─ Frontend first submits text fields via PUT /api/v1/seminars/{id}
   └─ If image was selected: second call POST /api/v1/seminars/{id}/cover-image (multipart/form-data)
   └─ On success: Dialog closes, card refreshes showing new image

4. Seminar card shows the cover image in top area
```

### Error / Edge Cases

```
File too large (>5MB):
   └─ Client-side check before any network call
   └─ Inline error below the upload area: "La imagen no puede superar 5MB"
   └─ No upload initiated

Wrong file type:
   └─ Client-side check (file.type not in allowed list)
   └─ Inline error: "Solo se aceptan imágenes JPG, PNG o WebP"

Upload succeeds but seminar PUT fails:
   └─ Image is already saved on server; seminar still has the old image URL
   └─ Acceptable: on next edit, admin sees the uploaded image as current
   └─ Better: upload after PUT succeeds (sequence matters)

Upload fails (network error, 413, server error):
   └─ Show toast: "Error al subir la imagen. Los otros cambios se han guardado."
   └─ Seminar text fields were already updated

Slow upload (large file on slow connection):
   └─ Show upload progress indicator (or at minimum a spinner)
   └─ Disable the Actualizar button during upload to prevent double-submit

Image not loading (broken URL, file deleted from disk):
   └─ Use onError on <img> to fall back to placeholder

Backend storage full:
   └─ Backend returns 507 or 500; show generic error toast
```

---

## Backend Implementation Notes (for roadmap ordering)

These are implementation decisions that affect phase sequencing:

1. **Domain entity changes first:** Both `cover_image_url` and `is_official` must be added to `Seminar` entity before any other work. This is the shared foundation.

2. **File upload is separate from seminar update:** The upload endpoint `POST /seminars/{id}/cover-image` is a dedicated endpoint, not part of the existing PUT. This keeps the existing update flow clean and avoids multipart/form-data on the main update endpoint.

3. **Static files mount:** FastAPI's `app.mount("/static", StaticFiles(directory="static"), name="static")` must be added to `app.py`. Files stored at `backend/static/uploads/seminars/{seminar_id}_{timestamp}.{ext}`. Filename includes seminar_id to allow cleanup.

4. **Pillow resizing:** Resize to max 1200px wide, preserve aspect ratio, convert to WebP for storage regardless of input format (reduces size). Return URL pointing to the WebP file.

5. **PaymentType enum extension:** The `PaymentType` enum in `payment.py` needs a new value `SEMINAR_OFICIALIDAD = "seminar_oficialidad"`. The webhook handler dispatches on this value.

6. **Idempotent mark_as_official:** The seminar repository needs a `mark_as_official(seminar_id: str) -> Seminar` method that sets `is_official = True` and `updated_at`. MongoDB `$set` makes this naturally idempotent.

---

## Sources

- Existing codebase: `backend/src/domain/entities/seminar.py`, `backend/src/infrastructure/web/routers/seminars.py`, `backend/src/infrastructure/adapters/services/redsys_service.py`, `backend/src/application/use_cases/payment/initiate_redsys_payment_use_case.py`
- Existing frontend: `frontend/src/features/seminars/components/SeminarList.tsx`, `frontend/src/features/seminars/components/SeminarForm.tsx`, `frontend/src/pages/payment-success.page.tsx`, `frontend/src/pages/payment-failure.page.tsx`
- Project requirements: `.planning/PROJECT.md`
- Established UX patterns for file upload in admin tools and payment confirmation flows (HIGH confidence — these are industry-standard patterns)

---

*Feature research for: Spain Aikikai Admin — Seminar Cover Image + Oficialidad Payment*
*Researched: 2026-02-27*
