---
phase: 02-oficialidad-payment-flow
plan: "04"
subsystem: frontend
tags:
  - payment
  - redsys
  - oficialidad
  - seminar
  - react-query
dependency_graph:
  requires:
    - 02-02  # Backend initiate endpoint and webhook
    - 02-03  # OfficialBadge component and is_official field
  provides:
    - initiateSeminarOficialidad service function
    - useInitiateSeminarOfficialidadMutation hook
    - SolicitudOficialidadModal component
    - Post-payment return handling with polling
  affects:
    - frontend/src/features/seminars/components/SeminarList.tsx
tech_stack:
  added:
    - useSearchParams (react-router-dom) for post-payment query param detection
    - useInterval polling pattern via setInterval + useRef
  patterns:
    - Hidden Redsys form submit (same as annual payment)
    - Inline modal error with role=alert (no toast on mutation error)
    - Polling with timeout fallback
    - URL param cleanup after detection
key_files:
  created:
    - frontend/src/features/seminars/data/services/seminar.service.ts (interface + function added)
    - frontend/src/features/seminars/hooks/mutations/useInitiateSeminarOficialidad.mutation.ts
    - frontend/src/features/seminars/components/SolicitudOficialidadModal.tsx
  modified:
    - frontend/src/features/seminars/components/SeminarList.tsx
decisions:
  - "Mutation errors displayed inside modal via role=alert, not toast — user can retry without reopening"
  - "Polling every 2s, 30s timeout with fallback message — avoids leaving user stuck if webhook is slow"
  - "Post-payment detection runs once on mount (empty deps array) — prevents re-triggering on rerender"
  - "Both own params (oficialidad, seminar_id) and Redsys params cleaned from URL on detection"
  - "Oficialidad button only in detail dialog, not card footer — keeps card UI clean"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-02-27"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
requirements_satisfied:
  - OFIC-02
  - OFIC-03
  - OFIC-05
  - OFIC-06
  - OFIC-07
---

# Phase 2 Plan 04: Frontend Oficialidad Payment Flow Summary

**One-liner:** End-to-end club admin oficialidad payment via Redsys: service function, mutation with hidden form submit, confirmation modal with price display, post-payment return handling with polling and toast notifications.

## What Was Built

Complete frontend implementation of the oficialidad payment flow:

1. **Service layer** (`seminar.service.ts`): Added `InitiateOfficialidadResponse` interface and `initiateSeminarOficialidad` function that POSTs to `/api/v1/seminars/{id}/oficialidad/initiate`. Function added to both named exports and `seminarService` object.

2. **Mutation hook** (`useInitiateSeminarOficialidad.mutation.ts`): React Query mutation that calls the service function. On success, creates and submits a hidden Redsys form (identical pattern to `useInitiateAnnualPaymentMutation`). Critically, has **no `onError` handler** — errors are propagated to the calling component for inline display.

3. **SolicitudOficialidadModal** (`SolicitudOficialidadModal.tsx`): Dialog (not AlertDialog) component with:
   - Explanation text with seminar title highlighted
   - Amber price box showing `formatCurrency(price)` prominently
   - Loading spinner when price is null
   - Inline error div with `role="alert"` and `aria-live="polite"` — no toast on error
   - Cancel button (disabled during pending) and Confirm button (spinner + disabled during pending)

4. **SeminarList.tsx wiring**:
   - `useAuthContext()` for `clubId` and `userRole`
   - Price fetching from `/api/v1/price-configurations` filtering by `key === 'oficialidad_seminar'`
   - Post-payment detection: reads `?oficialidad=ok|cancelled&seminar_id=...` on mount, cleans own + Redsys params
   - Polling logic: 2s interval, 30s max, stops when `is_official=true` then shows `toast.success('Seminario oficial!')`
   - Cancelled payment: `toast.info('Pago cancelado')`
   - "Solicitar Oficialidad" button in detail dialog guarded by: `!is_official && status !== 'cancelled' && userRole === 'club_admin' && seminar.club_id === clubId`
   - "Procesando pago..." disabled spinner state during polling

## Decisions Made

- **Inline modal error vs toast**: Errors stay in the modal so the user can retry immediately without reopening. This was a pre-planned design decision captured in 02-CONTEXT.md.
- **Polling on mount**: The `useEffect` that reads search params runs once with `[]` dependency to avoid re-triggering. `pollingStartRef` stores the start time to allow timeout calculation.
- **URL cleanup**: Both application params and Redsys-appended params (Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature) are removed after detection using `setSearchParams(..., { replace: true })`.
- **Button placement**: "Solicitar Oficialidad" is in the detail dialog only, keeping card footers uncluttered.

## Verification

- TypeScript: 0 errors (confirmed with `npx tsc --noEmit --skipLibCheck`)
- All `must_haves.truths` satisfied
- All `must_haves.artifacts` created and contain required identifiers
- All `must_haves.key_links` implemented correctly

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created/modified:
- FOUND: frontend/src/features/seminars/data/services/seminar.service.ts
- FOUND: frontend/src/features/seminars/hooks/mutations/useInitiateSeminarOficialidad.mutation.ts
- FOUND: frontend/src/features/seminars/components/SolicitudOficialidadModal.tsx
- FOUND: frontend/src/features/seminars/components/SeminarList.tsx

Commits:
- FOUND: 91b821f (Task 1 — service, mutation, modal)
- FOUND: 47f7959 (Task 2 — SeminarList wiring)
