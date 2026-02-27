# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Los clubes pueden gestionar sus socios y la federación puede supervisar y monetizar el ecosistema aikido español desde un único panel.
**Current focus:** Phase 1 — Seminar Cover Image

## Current Position

Phase: 1 of 3 (Seminar Cover Image)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-27 — Completed plan 01-01: backend cover image endpoints (POST/DELETE + StaticFiles)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 4 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-seminar-cover-image | 2 | 9 min | 4.5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (5 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project init: Oficialidad is automatic after Redsys payment — no manual approval step
- Project init: Only cover image (no gallery) — gallery is v2
- Project init: Price of oficialidad configurable by super admin via existing PriceConfiguration system
- Project init: Local filesystem storage for images — no S3/object storage in v1
- 01-01: cover_image_url stored as relative URL /uploads/seminars/{id}.jpg so frontend can prefix with API base URL
- 01-01: Atomic .tmp + rename write pattern prevents serving partial files during upload
- 01-01: StaticFiles mounted BEFORE app.include_router() calls to avoid route shadowing
- 01-02: uploadCoverImage/deleteCoverImage exported as named exports AND included in seminarService object for both import styles
- 01-02: Mutation error toasts cover network errors only; file-type/size validation handled inline in CoverImageDropZone (plan 01-03)
- 01-02: Both mutations invalidate ['seminars'] query cache on success

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: aiofiles installed (^25.1.0), uploads directory at backend/uploads/ isolated from invoices — RESOLVED by 01-01
- Phase 2: Inspect `ProcessRedsysWebhookUseCase` for exact location to add idempotency early-exit guard before implementing oficialidad webhook branch
- Phase 2: Inspect `get_process_redsys_webhook_use_case` DI factory in dependencies.py before modifying (580+ line file)
- Phase 1+2: Run MongoDB migration before deploying: `db.seminars.update_many({"is_official": {"$exists": false}}, {"$set": {"is_official": false}})`

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01-01-PLAN.md (backend cover image endpoints, StaticFiles, Pillow resize)
Resume file: None
