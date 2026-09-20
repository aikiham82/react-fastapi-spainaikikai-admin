# Session Context: Seminar Cover Image Feature

**Feature:** seminar_cover_image
**Phase:** 01-seminar-cover-image
**Started:** 2026-02-27
**Status:** Planning complete — ready to execute

---

## Summary

Phase 1 adds cover image upload/display to the existing seminar feature. Club admins can upload a JPEG/PNG/WebP file from the seminar edit form. The image is validated via magic bytes, resized to 800x450px (16:9) with Pillow, stored on the local filesystem, and served via FastAPI StaticFiles. The cover image appears as a full-bleed top banner in both the seminar card list and the seminar detail dialog.

---

## Architectural Decisions

### Upload behavior (LOCKED)
- Eager upload — file sent to server immediately on file selection, before form save
- Form save only records the returned `cover_image_url`; no file transfer at save time
- Drop zone: drag-and-drop + click-to-browse
- Drop zone is shown ONLY in edit mode (seminar already exists with an ID) — not on new seminar creation
- On image replace: old file deleted immediately from disk when new file uploads

### Display (LOCKED)
- Cover image: full-bleed top banner on seminar card (full width, image at top, content below)
- No cover image: colored placeholder with generic icon — card keeps same height
- Detail dialog: full-width banner at top, content below
- 16:9 aspect ratio via `aspect-video` Tailwind class (matches 800x450 server output)

### UX (LOCKED)
- Empty drop zone: dashed border + camera icon + "Arrastra o haz clic para subir"
- Remove: X/trash icon overlaid on preview (always visible)
- No confirmation on remove
- Validation errors shown inline below drop zone (no toast)
- All error messages in Spanish

### Storage (LOCKED)
- Local filesystem: `backend/uploads/seminars/{seminar_id}.jpg`
- Store relative URL in DB: `/uploads/seminars/{seminar_id}.jpg`
- Served via FastAPI StaticFiles mounted at `/uploads`

---

## Codebase Context

### Backend files to modify/create
- `backend/src/domain/entities/seminar.py` — add `cover_image_url: Optional[str] = None`
- `backend/src/infrastructure/web/dto/seminar_dto.py` — add `cover_image_url` to SeminarResponse
- `backend/src/infrastructure/web/mappers_seminar.py` — map `cover_image_url` in `to_response_dto`
- `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` — include `cover_image_url` in `_to_domain` and `_to_document`
- `backend/src/application/use_cases/seminar/upload_seminar_cover_image_use_case.py` — NEW
- `backend/src/application/use_cases/seminar/delete_seminar_cover_image_use_case.py` — NEW
- `backend/src/infrastructure/web/dependencies.py` — add DI factories for new use cases
- `backend/src/infrastructure/web/routers/seminars.py` — add POST + DELETE endpoints
- `backend/src/app.py` — mount StaticFiles + install aiofiles first

### Frontend files to modify/create
- `frontend/src/features/seminars/data/schemas/seminar.schema.ts` — add `cover_image_url?: string`
- `frontend/src/features/seminars/data/services/seminar.service.ts` — add `uploadCoverImage`, `deleteCoverImage`
- `frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts` — add `useUploadCoverImageMutation`, `useDeleteCoverImageMutation`
- `frontend/src/features/seminars/components/CoverImageDropZone.tsx` — NEW
- `frontend/src/features/seminars/components/SeminarForm.tsx` — embed CoverImageDropZone in edit mode
- `frontend/src/features/seminars/components/SeminarList.tsx` — card banner + detail dialog banner

---

## Key Technical Notes

1. **aiofiles required**: FastAPI StaticFiles needs `aiofiles`. Not currently installed. Must run `poetry add aiofiles` first.
2. **Magic bytes pattern**: JPEG = `FF D8 FF`, PNG = `89 50 4E 47`, WebP = `RIFF`(0-3) + `WEBP`(8-11). Read all content at once to avoid seek issues.
3. **Pillow**: Already installed (12.1.0). Use `ImageOps.fit(image, (800, 450), Image.LANCZOS)` for center-crop resize. Convert RGBA/P to RGB before saving as JPEG.
4. **StaticFiles mount**: Must come BEFORE routers in `app.py`. Mount at `/uploads`.
5. **File URL**: Store `/uploads/seminars/{seminar_id}.jpg` (relative). Frontend prefixes with `VITE_API_BASE_URL` or `apiClient.defaults.baseURL`.
6. **Drop zone edit-only**: Show `CoverImageDropZone` only when `seminar` prop is not null in SeminarForm.
7. **Race condition**: Write to temp file then `rename()` (atomic on Linux) to prevent corrupt images on concurrent replaces.

---

## Plans Created

| Plan | Description | Wave | Requirements |
|------|-------------|------|--------------|
| 01-01 | Backend: aiofiles + entity + use cases + repository + endpoints + StaticFiles | 1 | IMG-01, IMG-02, IMG-03, IMG-04, IMG-05 |
| 01-02 | Frontend data layer: schema types + service functions + mutations | 1 | IMG-01, IMG-04, IMG-05 |
| 01-03 | Frontend UI: CoverImageDropZone + SeminarForm + SeminarList | 2 | IMG-01, IMG-04, IMG-05, IMG-06, IMG-07 |

---

## Sub-Agent Recommendations

*(To be filled after sub-agent consultations during execution phase)*

---

*Created by gsd-planner on 2026-02-27*
