# Phase 1: Seminar Cover Image - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Club admins can upload, replace, and remove a cover image for their seminars. The image is stored on the local filesystem, resized to 800×450px (16:9) server-side, and displayed as a full-bleed banner in both the seminar card list and the seminar detail dialog. Managing other seminar fields and the oficialidad badge are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Upload behavior
- Eager upload — file is sent to the server immediately on selection, before the form is saved
- The form save only records the returned image URL; no file transfer happens at save time
- Drop zone supports drag-and-drop AND click-to-browse
- Upload control lives inline within the seminar edit form/dialog (not a separate section)
- When replacing an existing image, the old image is deleted immediately when the new file uploads — no deferred state

### Card list display
- Cover image renders as a full-bleed top banner on the seminar card (full width, image at top, text/info below)
- Seminars without a cover image show a colored placeholder with a generic icon — cards keep the same height regardless of image presence
- In the seminar detail dialog, the cover image is a full-width banner at the top of the dialog, content below
- 16:9 aspect ratio used consistently for both card banner and detail banner (matches the 800×450px server output)

### Placeholder & remove UX
- Empty drop zone (no image yet): dashed border zone with a camera icon and instruction text ("Arrastra o haz clic para subir")
- Remove control: X / trash icon overlaid on the preview image (visible on hover or always visible)
- No confirmation dialog for removal — clicking X removes immediately (form hasn't been saved yet, so cancel is still available)
- After removing in the form, the area returns to the empty drop zone state (dashed border + camera icon)

### Error & validation feedback
- Errors appear inline, directly below the drop zone — no toast for file validation errors
- Client-side validation runs first (file type by extension/MIME, file size ≤ 5MB); server validation via magic bytes is the authoritative safety net
- If upload fails mid-way (network error, 500), inline error is shown and the drop zone resets so the user can retry immediately
- All error messages are written in Spanish (consistent with the rest of the admin UI)

### Claude's Discretion
- Exact color/gradient of the placeholder when no image is present
- Specific Spanish error message copy (e.g., "El archivo supera el tamaño máximo de 5MB")
- Loading/spinner design during the eager upload
- Drop zone hover and active states (styling)

</decisions>

<specifics>
## Specific Ideas

- No specific visual references provided — standard modern admin UI patterns apply
- The drop zone instruction text should be in Spanish: something like "Arrastra una imagen aquí o haz clic para seleccionar"
- Error messages in Spanish examples: "Formato no permitido. Usa JPEG, PNG o WebP.", "El archivo supera el límite de 5MB"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-seminar-cover-image*
*Context gathered: 2026-02-27*
