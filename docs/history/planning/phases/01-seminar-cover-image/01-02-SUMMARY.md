---
phase: 01-seminar-cover-image
plan: "02"
subsystem: ui
tags: [react, typescript, react-query, axios, multipart, seminar, cover-image]

requires: []
provides:
  - "Seminar TypeScript interface with cover_image_url?: string optional field"
  - "seminarService.uploadCoverImage(seminarId, file) — multipart/form-data POST to /api/v1/seminars/{id}/cover-image"
  - "seminarService.deleteCoverImage(seminarId) — DELETE to /api/v1/seminars/{id}/cover-image"
  - "useUploadCoverImageMutation hook for cover image upload"
  - "useDeleteCoverImageMutation hook for cover image deletion"
affects:
  - 01-03-PLAN (CoverImageDropZone component consumes these mutations and service types)

tech-stack:
  added: []
  patterns:
    - "Multipart FormData upload via apiClient.post with Content-Type override header"
    - "React Query mutation with {mutationFn, onSuccess, onError} appending to existing mutations file"

key-files:
  created: []
  modified:
    - frontend/src/features/seminars/data/schemas/seminar.schema.ts
    - frontend/src/features/seminars/data/services/seminar.service.ts
    - frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts

key-decisions:
  - "uploadCoverImage and deleteCoverImage added as named exports AND included in seminarService object for both import styles"
  - "Mutation error toasts cover network errors only — client-side validation (file type, size) handled inline in CoverImageDropZone (plan 01-03)"
  - "Both mutations invalidate ['seminars'] query cache on success to refresh seminar list and detail views"

patterns-established:
  - "Multipart upload: new FormData() + append('file', file) + Content-Type multipart/form-data header override"
  - "Cover image mutations: useUploadCoverImageMutation({ seminarId, file }) and useDeleteCoverImageMutation(seminarId)"

requirements-completed: [IMG-01, IMG-04, IMG-05]

duration: 5min
completed: 2026-02-27
---

# Phase 01 Plan 02: Frontend Data Layer for Seminar Cover Image Summary

**Seminar TypeScript interface extended with cover_image_url, plus uploadCoverImage/deleteCoverImage service functions and React Query mutations wired to /api/v1/seminars/{id}/cover-image**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T12:11:53Z
- **Completed:** 2026-02-27T12:17:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `cover_image_url?: string` to the Seminar TypeScript interface, enabling typed access to cover image URLs throughout the frontend
- Created `uploadCoverImage` and `deleteCoverImage` service functions with correct multipart/form-data and DELETE semantics
- Created `useUploadCoverImageMutation` and `useDeleteCoverImageMutation` React Query hooks following the project's standard mutation pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cover_image_url to Seminar interface and create service functions** - `d7c9698` (feat)
2. **Task 2: Add upload and delete cover image mutations** - `4fd6feb` (feat)

## Files Created/Modified
- `frontend/src/features/seminars/data/schemas/seminar.schema.ts` - Added `cover_image_url?: string` to Seminar interface
- `frontend/src/features/seminars/data/services/seminar.service.ts` - Added `uploadCoverImage` and `deleteCoverImage` functions and included them in seminarService export object
- `frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts` - Appended `useUploadCoverImageMutation` and `useDeleteCoverImageMutation` hooks

## Decisions Made
- Both functions are exported as named exports AND included in the `seminarService` object so consumers can use either import style consistently with the rest of the service
- Mutation toast messages are in Spanish (matching existing mutations): "Imagen de portada actualizada", "Imagen de portada eliminada", "Error al subir la imagen", "Error al eliminar la imagen"
- Error toasts in mutations cover only network-level errors; file-type/size validation errors are intentionally left to the CoverImageDropZone component (plan 01-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed with zero errors after both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Frontend data layer (types + service + mutations) is complete and ready for the CoverImageDropZone UI component (plan 01-03)
- Backend endpoints (plan 01-01) can be developed in parallel; no frontend dependency on backend completion
- All three exported hooks (`useUploadCoverImageMutation`, `useDeleteCoverImageMutation`) and the updated `Seminar` interface are available for import in plan 01-03

---
*Phase: 01-seminar-cover-image*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: frontend/src/features/seminars/data/schemas/seminar.schema.ts
- FOUND: frontend/src/features/seminars/data/services/seminar.service.ts
- FOUND: frontend/src/features/seminars/hooks/mutations/useSeminarMutations.ts
- FOUND: .planning/phases/01-seminar-cover-image/01-02-SUMMARY.md
- FOUND commit d7c9698: feat(01-02): add cover_image_url to Seminar interface and service functions
- FOUND commit 4fd6feb: feat(01-02): add useUploadCoverImageMutation and useDeleteCoverImageMutation
