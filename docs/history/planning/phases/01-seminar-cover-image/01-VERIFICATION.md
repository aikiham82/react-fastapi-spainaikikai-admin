---
phase: 01-seminar-cover-image
verified: 2026-02-27T12:45:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 01: Seminar Cover Image Verification Report

**Phase Goal:** Club admins can upload, replace, and remove a cover image for their seminars, and that image is visible in the card list and in the seminar detail.
**Verified:** 2026-02-27T12:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                          | Status     | Evidence                                                                                 |
|----|----------------------------------------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------|
| 1  | POST /api/v1/seminars/{id}/cover-image accepts JPEG/PNG/WebP and returns updated seminar with cover_image_url  | VERIFIED   | `seminars.py` lines 198-228: full endpoint with magic bytes check, resize, atomic write  |
| 2  | POST /api/v1/seminars/{id}/cover-image rejects files > 5MB with HTTP 413 and Spanish error detail             | VERIFIED   | `seminars.py` lines 212-216: `HTTP_413_REQUEST_ENTITY_TOO_LARGE`, Spanish message        |
| 3  | POST /api/v1/seminars/{id}/cover-image rejects non-image files via magic bytes with HTTP 422 and Spanish error | VERIFIED   | `seminars.py` `validate_image_magic_bytes()` raises HTTP 422 with Spanish message        |
| 4  | Saved image is 800x450px JPEG stored at uploads/seminars/{seminar_id}.jpg                                     | VERIFIED   | `process_image()` uses `ImageOps.fit((800,450))`, atomic `.tmp` → rename; dir exists    |
| 5  | DELETE /api/v1/seminars/{id}/cover-image removes file from disk and sets cover_image_url to null              | VERIFIED   | `seminars.py` lines 231-248: `file_path.unlink()` + `DeleteSeminarCoverImageUseCase`     |
| 6  | GET /uploads/seminars/{id}.jpg returns image via StaticFiles                                                   | VERIFIED   | `app.py` line 117: `app.mount("/uploads", StaticFiles(...))` before all routers          |
| 7  | Seminar TypeScript interface includes cover_image_url as optional string                                       | VERIFIED   | `seminar.schema.ts` line 20: `cover_image_url?: string`                                 |
| 8  | seminarService.uploadCoverImage sends multipart/form-data POST to /api/v1/seminars/{id}/cover-image           | VERIFIED   | `seminar.service.ts` lines 37-45: FormData + `Content-Type: multipart/form-data`        |
| 9  | seminarService.deleteCoverImage sends DELETE to /api/v1/seminars/{id}/cover-image                             | VERIFIED   | `seminar.service.ts` lines 47-49: `apiClient.delete`                                    |
| 10 | useUploadCoverImageMutation and useDeleteCoverImageMutation exist with standard mutation shape                 | VERIFIED   | `useSeminarMutations.ts` lines 67-96: both hooks exported with mutationFn/onSuccess/onError |
| 11 | Drop zone appears in edit mode only (seminar prop not null); not shown in create mode                         | VERIFIED   | `SeminarForm.tsx` lines 163-171: `{seminar && <CoverImageDropZone ... />}`               |
| 12 | Client-side validation rejects wrong MIME type and files >5MB with Spanish inline error                       | VERIFIED   | `CoverImageDropZone.tsx` lines 11-22: `validateFile()` + `<p className="text-sm text-destructive">` |
| 13 | Seminar cards show 16:9 image banner (or Calendar placeholder) above card content                              | VERIFIED   | `SeminarList.tsx` lines 138-151: `aspect-video` div with conditional `img` or placeholder |
| 14 | Seminar detail dialog shows full-width cover image banner when cover_image_url is set                          | VERIFIED   | `SeminarList.tsx` lines 225-234: `{seminar.cover_image_url && <div>...<img>...</div>}`  |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact                                                                           | Expected                                              | Status     | Details                                                                     |
|------------------------------------------------------------------------------------|-------------------------------------------------------|------------|-----------------------------------------------------------------------------|
| `backend/src/domain/entities/seminar.py`                                          | `cover_image_url: Optional[str] = None`               | VERIFIED   | Line 36: field present, defaults to None                                    |
| `backend/src/infrastructure/web/dto/seminar_dto.py`                               | `cover_image_url: Optional[str] = None` in Response   | VERIFIED   | Line 53: field present in `SeminarResponse`                                 |
| `backend/src/infrastructure/web/mappers_seminar.py`                               | Maps `cover_image_url` in `to_response_dto`           | VERIFIED   | Line 55: `cover_image_url=entity.cover_image_url`                           |
| `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py`  | `_to_domain` reads + `_to_document` writes field      | VERIFIED   | Lines 41, 61: both directions handled                                        |
| `backend/src/application/use_cases/seminar/upload_seminar_cover_image_use_case.py`| `UploadSeminarCoverImageUseCase.execute(id, url)`     | VERIFIED   | 19 lines, full hexagonal pattern, find → mutate → update                    |
| `backend/src/application/use_cases/seminar/delete_seminar_cover_image_use_case.py`| `DeleteSeminarCoverImageUseCase.execute(id)`          | VERIFIED   | 19 lines, full hexagonal pattern, find → set None → update                  |
| `backend/src/infrastructure/web/routers/seminars.py`                              | POST + DELETE `/{seminar_id}/cover-image` endpoints   | VERIFIED   | Lines 198-248: both endpoints with auth, validation, file I/O               |
| `backend/src/app.py`                                                               | `StaticFiles` mount at `/uploads` before routers      | VERIFIED   | Line 117 mount, routers start at line 120                                   |
| `backend/pyproject.toml`                                                           | `aiofiles ^25.1.0`                                    | VERIFIED   | Line 31 confirmed                                                           |
| `frontend/src/features/seminars/data/schemas/seminar.schema.ts`                   | `cover_image_url?: string` on Seminar interface       | VERIFIED   | Line 20 confirmed                                                           |
| `frontend/src/features/seminars/data/services/seminar.service.ts`                 | `uploadCoverImage`, `deleteCoverImage` in service obj | VERIFIED   | Lines 37-59: both functions and in export object                            |
| `frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts`           | Both cover image mutations exported                   | VERIFIED   | Lines 67-96: both mutations with standard shape                             |
| `frontend/src/features/seminars/components/CoverImageDropZone.tsx`                | 80+ line self-contained drop zone component           | VERIFIED   | 165 lines: empty/preview/uploading states, validation, inline errors        |
| `frontend/src/features/seminars/components/SeminarForm.tsx`                       | `CoverImageDropZone` rendered in edit mode only       | VERIFIED   | Lines 163-171: `{seminar && <CoverImageDropZone ... />}`                    |
| `frontend/src/features/seminars/components/SeminarList.tsx`                       | Card banner + detail dialog use `cover_image_url`     | VERIFIED   | Lines 138-151 (card), 225-234 (dialog)                                      |

---

### Key Link Verification

| From                              | To                                            | Via                                         | Status   | Details                                                                    |
|-----------------------------------|-----------------------------------------------|---------------------------------------------|----------|----------------------------------------------------------------------------|
| `seminars.py` router              | `upload_seminar_cover_image_use_case.py`      | `Depends(get_upload_seminar_cover_image_use_case)` | WIRED | Lines 24-25 import, line 203 Depends                                  |
| `seminars.py` router              | `delete_seminar_cover_image_use_case.py`      | `Depends(get_delete_seminar_cover_image_use_case)` | WIRED | Lines 24-25 import, line 235 Depends                                  |
| `app.py`                          | `backend/uploads/` directory                  | `app.mount("/uploads", StaticFiles(...))`   | WIRED    | Line 117; path resolves correctly to `backend/uploads/`                   |
| `dependencies.py`                 | `UploadSeminarCoverImageUseCase`              | `@lru_cache()` factory lines 290-293        | WIRED    | Factory registered and imported in router                                  |
| `dependencies.py`                 | `DeleteSeminarCoverImageUseCase`              | `@lru_cache()` factory lines 295-298        | WIRED    | Factory registered and imported in router                                  |
| `mongodb_seminar_repository.py`   | `cover_image_url` field                       | `_to_domain` + `_to_document`               | WIRED    | Lines 41 and 61: both read and write paths present                         |
| `CoverImageDropZone.tsx`          | `useUploadCoverImageMutation`                 | `import` from `useSeminarMutations`         | WIRED    | Line 4: import confirmed; `uploadMutation.mutateAsync` called line 46      |
| `CoverImageDropZone.tsx`          | `useDeleteCoverImageMutation`                 | `import` from `useSeminarMutations`         | WIRED    | Line 4: import confirmed; `deleteMutation.mutateAsync` called line 57      |
| `SeminarForm.tsx`                 | `CoverImageDropZone.tsx`                      | `import` + conditional render               | WIRED    | Line 17 import; lines 163-171 conditional render in edit mode              |
| `SeminarList.tsx`                 | `seminar.cover_image_url`                     | conditional `img` in card and dialog        | WIRED    | Lines 140, 142, 226, 229: field read and rendered                          |
| `useSeminarMutations.ts`          | `seminar.service.ts`                          | `seminarService.uploadCoverImage/deleteCoverImage` | WIRED | Lines 72 and 87: service calls confirmed                            |
| `seminar.service.ts`              | `POST /api/v1/seminars/{id}/cover-image`      | `apiClient.post` with FormData              | WIRED    | Lines 40-44: FormData + multipart/form-data header                         |
| `seminar.service.ts`              | `DELETE /api/v1/seminars/{id}/cover-image`    | `apiClient.delete`                          | WIRED    | Line 48: delete call confirmed                                             |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                              | Status    | Evidence                                                                                         |
|-------------|-------------|--------------------------------------------------------------------------|-----------|--------------------------------------------------------------------------------------------------|
| IMG-01      | 01-01, 01-02, 01-03 | Club admin puede subir imagen de portada desde formulario de edición | SATISFIED | `CoverImageDropZone` in `SeminarForm` edit mode; POST endpoint fully wired                      |
| IMG-02      | 01-01       | Servidor valida tipo de archivo por magic bytes                          | SATISFIED | `validate_image_magic_bytes()` in `seminars.py`; checks JPEG `\xff\xd8\xff`, PNG `\x89PNG`, WEBP RIFF |
| IMG-03      | 01-01       | Servidor redimensiona imagen a 800x450px (16:9)                         | SATISFIED | `process_image()` uses `ImageOps.fit((800, 450), Image.LANCZOS)` then saves as JPEG             |
| IMG-04      | 01-01, 01-02, 01-03 | Rechaza archivos mayores de 5MB con mensaje de error claro           | SATISFIED | Client: `validateFile()` in `CoverImageDropZone`; Server: HTTP 413 in router                    |
| IMG-05      | 01-01, 01-02, 01-03 | Club admin puede eliminar imagen de portada existente                  | SATISFIED | DELETE endpoint removes file from disk + clears DB; X button in `CoverImageDropZone`            |
| IMG-06      | 01-03       | Seminarios con imagen muestran imagen en tarjeta del listado            | SATISFIED | `SeminarList.tsx` lines 138-151: `aspect-video` banner with `object-cover` image                |
| IMG-07      | 01-03       | Seminarios con imagen muestran imagen en página de detalle              | SATISFIED | `SeminarList.tsx` lines 225-234: cover image in detail Dialog                                   |

All 7 phase requirements (IMG-01 through IMG-07) are SATISFIED.

---

### Anti-Patterns Found

None detected.

The `return null` on line 21 of `CoverImageDropZone.tsx` is the clean return value from `validateFile()` meaning "no error" — not a stub pattern.

All files are fully implemented with no TODO, FIXME, placeholder comments, empty handlers, or stub returns.

---

### Human Verification Required

One aspect was confirmed by the phase executor via human checkpoint (Plan 01-03, Task 3), but is worth re-confirming if desired:

#### 1. Drag-and-drop visual feedback

**Test:** In the edit form, drag an image file over the drop zone without releasing.
**Expected:** Border changes to primary color and background lightens (`border-primary bg-primary/5`).
**Why human:** CSS transition on `isDragging` state cannot be verified statically.

#### 2. Upload loading state

**Test:** Upload a valid image and observe the UI during the upload.
**Expected:** A spinning `Loader2` icon appears overlaid on the drop zone; click and drag are disabled.
**Why human:** Async loading state cannot be verified programmatically from static code.

#### 3. Image replacement (upload over existing)

**Test:** After uploading an image, upload a second different image on the same seminar.
**Expected:** The old file is overwritten (same filename `{seminar_id}.jpg`), the preview updates.
**Why human:** Atomic rename overwrites; requires live filesystem + browser verification.

---

### Path Verification Note

The UPLOAD_DIR path calculation in `seminars.py` (`Path(__file__).parent × 5 / "uploads" / "seminars"`) and the StaticFiles path in `app.py` (`Path(__file__).parent.parent / "uploads"`) were both confirmed programmatically to resolve to `backend/uploads/seminars/` and `backend/uploads/` respectively. Both are consistent. The `backend/uploads/seminars/` directory exists on disk with a real uploaded file (`69a18d19bbdc193c17b01755.jpg`), confirming the full upload path was exercised successfully.

---

## Gaps Summary

No gaps found. All 14 observable truths are verified, all artifacts are substantive and wired, all 7 requirements are satisfied, and no anti-patterns were detected.

---

_Verified: 2026-02-27T12:45:00Z_
_Verifier: Claude (gsd-verifier)_
