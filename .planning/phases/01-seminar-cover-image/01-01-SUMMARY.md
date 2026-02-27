---
phase: 01-seminar-cover-image
plan: "01"
subsystem: api
tags: [fastapi, mongodb, pillow, aiofiles, staticfiles, file-upload, image-processing]

# Dependency graph
requires: []
provides:
  - "POST /api/v1/seminars/{id}/cover-image — validates magic bytes, enforces 5MB limit, resizes to 800x450 JPEG, stores atomically"
  - "DELETE /api/v1/seminars/{id}/cover-image — removes file from disk, clears cover_image_url in DB"
  - "StaticFiles mount at /uploads serving backend/uploads/ directory"
  - "Seminar entity extended with cover_image_url: Optional[str] = None"
  - "SeminarResponse DTO and mapper propagate cover_image_url"
  - "MongoDB repository _to_domain and _to_document handle cover_image_url"
  - "UploadSeminarCoverImageUseCase and DeleteSeminarCoverImageUseCase following hexagonal pattern"
affects:
  - 01-02
  - 01-03

# Tech tracking
tech-stack:
  added:
    - "aiofiles ^25.1.0 (required by FastAPI StaticFiles)"
  patterns:
    - "Atomic file write via .tmp then rename to prevent partial reads"
    - "Magic bytes validation (not file extension) for JPEG/PNG/WebP"
    - "PIL ImageOps.fit for aspect-ratio-preserving crop-to-800x450"
    - "StaticFiles mounted BEFORE app.include_router() calls in create_app()"

key-files:
  created:
    - "backend/src/application/use_cases/seminar/upload_seminar_cover_image_use_case.py"
    - "backend/src/application/use_cases/seminar/delete_seminar_cover_image_use_case.py"
  modified:
    - "backend/src/domain/entities/seminar.py"
    - "backend/src/infrastructure/web/dto/seminar_dto.py"
    - "backend/src/infrastructure/web/mappers_seminar.py"
    - "backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py"
    - "backend/src/infrastructure/web/dependencies.py"
    - "backend/src/infrastructure/web/routers/seminars.py"
    - "backend/src/app.py"
    - "backend/pyproject.toml"

key-decisions:
  - "aiofiles installed even though direct async file I/O is synchronous path.write_bytes — required by FastAPI StaticFiles internals"
  - "UPLOAD_DIR resolves to backend/uploads/seminars/ via Path(__file__).parent traversal — keeps uploads outside src/"
  - "cover_image_url stored as /uploads/seminars/{id}.jpg (relative URL) so frontend can prefix with API base URL"
  - "pre-existing test_seminar_not_found_error failure confirmed as pre-existing (Spanish message vs English assertion) — not caused by this plan"

patterns-established:
  - "Cover image endpoints follow same auth pattern as other seminar mutation endpoints (super_admin bypass or club access check)"
  - "Use case execute signature: upload(seminar_id, cover_image_url) -> Seminar, delete(seminar_id) -> Seminar"

requirements-completed: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-05]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 1 Plan 01: Seminar Cover Image Backend Summary

**FastAPI cover image upload/delete endpoints with Pillow resize to 800x450 JPEG, magic bytes validation, 5MB limit, atomic file write, and StaticFiles serving at /uploads**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T12:12:11Z
- **Completed:** 2026-02-27T12:16:59Z
- **Tasks:** 3
- **Files modified:** 10 (8 source, 2 dependency files)

## Accomplishments
- Extended Seminar domain entity, SeminarResponse DTO, mapper, and MongoDB repository with cover_image_url field
- Created UploadSeminarCoverImageUseCase and DeleteSeminarCoverImageUseCase following hexagonal architecture pattern
- Added POST/DELETE /api/v1/seminars/{id}/cover-image endpoints with magic bytes validation, 5MB file size limit, Pillow resize to 800x450 JPEG, and atomic write
- Mounted FastAPI StaticFiles at /uploads before routers to serve uploaded images

## Task Commits

Each task was committed atomically:

1. **Task 1: Install aiofiles and extend domain + infrastructure layer** - `b608c3a` (feat)
2. **Task 2: Create use cases, update DI, add API endpoints, mount StaticFiles** - `d44b137` (feat)
3. **Task 3: Run backend tests to confirm no regressions** - no commit (no files modified)

## Files Created/Modified
- `backend/src/domain/entities/seminar.py` - Added `cover_image_url: Optional[str] = None` field
- `backend/src/infrastructure/web/dto/seminar_dto.py` - Added `cover_image_url: Optional[str] = None` to SeminarResponse
- `backend/src/infrastructure/web/mappers_seminar.py` - Map `cover_image_url` in `to_response_dto`
- `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` - Handle `cover_image_url` in `_to_domain` and `_to_document`
- `backend/src/application/use_cases/seminar/upload_seminar_cover_image_use_case.py` - NEW: UploadSeminarCoverImageUseCase
- `backend/src/application/use_cases/seminar/delete_seminar_cover_image_use_case.py` - NEW: DeleteSeminarCoverImageUseCase
- `backend/src/infrastructure/web/dependencies.py` - Added DI factories for both new use cases
- `backend/src/infrastructure/web/routers/seminars.py` - Added POST/DELETE cover-image endpoints with validation helpers
- `backend/src/app.py` - Added StaticFiles mount at /uploads before routers
- `backend/pyproject.toml` + `poetry.lock` - Added aiofiles ^25.1.0

## Decisions Made
- Used `Path(__file__).parent` traversal to resolve `backend/uploads/seminars/` so it works regardless of working directory
- Stored `cover_image_url` as relative path `/uploads/seminars/{id}.jpg` — frontend prepends API base URL
- Used atomic `.tmp` + `.rename()` pattern to prevent serving partial files during upload
- `aiofiles` installed because FastAPI StaticFiles requires it internally even though file writes in this code use synchronous `Path.write_bytes`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Pre-existing test failure (not caused by this plan):**
`tests/domain/seminar/test_seminar_exceptions.py::TestSeminarExceptions::test_seminar_not_found_error` was already failing before our changes. The test asserts `"not found" in str(error).lower()` but `EntityNotFoundError.__init__` produces a Spanish message `"Seminar con ID {id} no encontrado"`. Confirmed by running `git stash` before our commits — same failure. All 29 other seminar tests pass.

## User Setup Required

None — no external service configuration required. The `backend/uploads/seminars/` directory is created automatically on first upload.

## Next Phase Readiness

- Backend API endpoints complete and verified: POST/DELETE `/api/v1/seminars/{id}/cover-image` and GET `/uploads/seminars/{id}.jpg`
- Ready for plan 01-02: Frontend data layer (mutations, queries, service calls)
- Ready for plan 01-03: Frontend UI components

## Self-Check: PASSED

All created files confirmed present on disk. Task commits verified:
- `b608c3a` — feat(01-01): install aiofiles and extend seminar domain + infrastructure layer
- `d44b137` — feat(01-01): add cover image upload/delete endpoints and mount StaticFiles

---
*Phase: 01-seminar-cover-image*
*Completed: 2026-02-27*
