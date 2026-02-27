---
phase: 01-seminar-cover-image
plan: "03"
subsystem: ui
tags: [react, typescript, tailwind, radix-ui, react-query, file-upload, drag-and-drop]

# Dependency graph
requires:
  - phase: 01-01
    provides: Backend cover image upload/delete endpoints and StaticFiles serving
  - phase: 01-02
    provides: useUploadCoverImageMutation, useDeleteCoverImageMutation, cover_image_url in Seminar interface
provides:
  - CoverImageDropZone component with drag-and-drop, upload, preview, and remove
  - SeminarForm with drop zone embedded in edit mode only
  - SeminarList cards with 16:9 cover image banners and Calendar placeholder
  - Edit (Pencil) button added to seminar card actions
affects:
  - 02 (oficialidad phase — SeminarList is a shared component)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-contained upload component — calls mutations directly, no callback props needed
    - Client-side MIME + size validation before any server round-trip
    - Eager upload — image saved immediately on drop/select, no form-save required
    - Relative URL stored in DB, frontend prefixes with VITE_API_URL for rendering

key-files:
  created:
    - frontend/src/features/seminars/components/CoverImageDropZone.tsx
  modified:
    - frontend/src/features/seminars/components/SeminarForm.tsx
    - frontend/src/features/seminars/components/SeminarList.tsx
    - backend/src/app.py

key-decisions:
  - "CoverImageDropZone does not accept callbacks — it invalidates the seminars query directly so the parent re-renders with the new URL automatically"
  - "Drop zone only rendered when seminar prop is non-null (edit mode) — create mode intentionally excluded per requirements"
  - "StaticFiles path corrected: parent.parent.parent (project root) → parent.parent (backend/uploads/) so images are actually served"
  - "Edit (Pencil) button added to SeminarList card actions — discovered the card had no direct edit shortcut"

patterns-established:
  - "Upload component pattern: self-contained mutations + query invalidation (no prop drilling)"
  - "Drag-and-drop pattern: onDragOver/onDragLeave/onDrop with isDragging state for visual feedback"
  - "Image URL pattern: relative path stored (/uploads/...), prefixed with VITE_API_URL ?? 'http://localhost:8000' at render time"

requirements-completed: [IMG-01, IMG-04, IMG-05, IMG-06, IMG-07]

# Metrics
duration: ~45min
completed: 2026-02-27
---

# Phase 1 Plan 03: Seminar Cover Image — Frontend Components Summary

**React CoverImageDropZone with drag-and-drop eager upload, client-side validation, and 16:9 card banners in SeminarList**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-02-27
- **Completed:** 2026-02-27
- **Tasks:** 2 auto + 1 checkpoint (human-verify, approved)
- **Files modified:** 4

## Accomplishments

- CoverImageDropZone component built with empty state (dashed border + camera icon), preview state (image + X button), uploading state (Loader2 spinner), client-side validation (MIME type + 5MB size limit), and Spanish inline error messages
- SeminarForm extended to render CoverImageDropZone as the first field in edit mode only (seminar prop non-null guard)
- SeminarList cards updated with full-bleed 16:9 cover image banner above card content — shows uploaded image or gradient placeholder with Calendar icon
- StaticFiles path bug fixed: `parent.parent.parent` resolved to project root instead of `backend/uploads/`, corrected to `parent.parent`
- Edit (Pencil) button added to SeminarList card action row for direct edit access

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CoverImageDropZone component** - `a6f5da6` (feat)
2. **Task 2: Integrate CoverImageDropZone into SeminarForm and update SeminarList** - `11a9508` (feat)
3. **Post-checkpoint fix: StaticFiles path and SeminarList edit button** - `36bc85f` (fix)

## Files Created/Modified

- `frontend/src/features/seminars/components/CoverImageDropZone.tsx` - Self-contained drop zone component: drag-and-drop, file input, upload/delete mutations, preview, validation, error display
- `frontend/src/features/seminars/components/SeminarForm.tsx` - CoverImageDropZone embedded at top of form, rendered only when seminar prop is non-null (edit mode)
- `frontend/src/features/seminars/components/SeminarList.tsx` - Card banner with 16:9 aspect-video image or Calendar placeholder; added Pencil edit button to card actions
- `backend/src/app.py` - StaticFiles upload_path corrected from `.parent.parent.parent` to `.parent.parent` to serve from `backend/uploads/`

## Decisions Made

- **No callback props on CoverImageDropZone:** The component calls `useUploadCoverImageMutation` and `useDeleteCoverImageMutation` directly. Both mutations invalidate the `['seminars']` query on success, causing the parent to re-render with the updated `cover_image_url` automatically. This avoids prop drilling and keeps the component self-contained.
- **Eager upload (no form save required):** Image is uploaded immediately on file selection/drop, not on form submit. This matches the requirement and simplifies state management.
- **VITE_API_URL prefix pattern:** Images are stored as relative paths in the DB (`/uploads/seminars/{id}.jpg`). Frontend renders them as `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${cover_image_url}`. This matches the existing apiClient base URL configuration.
- **Edit button added:** SeminarList had no direct edit shortcut on the card — only the detail dialog had no edit action. Added a Pencil button gated by `canAccess({ resource: 'seminars', action: 'update' })`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed StaticFiles path resolving to project root instead of backend/uploads/**
- **Found during:** Post-checkpoint human verification (Task 3)
- **Issue:** `Path(__file__).parent.parent.parent / "uploads"` resolved three levels up from `backend/src/app.py`, pointing to the project root rather than `backend/uploads/` where images are saved by the upload use case
- **Fix:** Changed to `Path(__file__).parent.parent / "uploads"` so it correctly resolves to `backend/uploads/`
- **Files modified:** `backend/src/app.py`
- **Verification:** Images loaded correctly in the browser after the fix
- **Committed in:** `36bc85f`

**2. [Rule 2 - Missing Critical] Added Pencil edit button to SeminarList card actions**
- **Found during:** Post-checkpoint human verification (Task 3)
- **Issue:** SeminarList cards had no direct shortcut to open the edit form — users had to navigate through the detail dialog to find an edit action
- **Fix:** Added a Pencil button (Lucide `Pencil` icon) gated by `canAccess({ resource: 'seminars', action: 'update' })` that calls `setSelectedSeminarForEdit(seminar); setIsFormOpen(true)` directly
- **Files modified:** `frontend/src/features/seminars/components/SeminarList.tsx`
- **Committed in:** `36bc85f`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical UX action)
**Impact on plan:** Both fixes were necessary for the feature to work correctly and be usable. No scope creep.

## Issues Encountered

- StaticFiles path bug caused images to 404 after upload — caught during human verification and fixed immediately
- SeminarList had an `Eye` detail button but no direct edit button — added alongside the fix commit

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All IMG-01 through IMG-07 requirements are visually verifiable in the browser
- Cover image upload, preview, remove, card banners, and detail dialog banner all working end-to-end
- Phase 1 is complete — ready for Phase 2 (oficialidad seminar webhook integration)
- Note for Phase 2: `ProcessRedsysWebhookUseCase` and `get_process_redsys_webhook_use_case` DI factory need inspection before implementing idempotency guard

---
*Phase: 01-seminar-cover-image*
*Completed: 2026-02-27*
