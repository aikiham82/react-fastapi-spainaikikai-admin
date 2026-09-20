# Phase 2: Oficialidad Payment Flow - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Club admins can pay via Redsys to have their seminar endorsed by Spain Aikikai. After confirmed payment, the seminar is automatically marked official — no manual approval step. Super admin configures the price. Official seminars show a Spain Aikikai badge in both the card list and the seminar detail.

</domain>

<decisions>
## Implementation Decisions

### Pre-payment UX
- Clicking "Solicitar Oficialidad" opens a **modal** (not an inline expand or immediate redirect)
- Modal shows: the configured **price prominently** + a brief explanation of what oficialidad means (Spain Aikikai endorsement)
- After confirming in the modal, the **Confirm button shows a spinner** while the backend creates the Redsys order; browser navigates to Redsys once the call resolves
- If the backend call fails (any error, including 409), an **error message appears inside the modal** — modal stays open so the user can retry or cancel; no toast + close pattern

### Badge / Seal Design
- Badge is a **corner overlay on the cover image, top-right position** — consistent across card list and seminar detail
- Badge style: **icon + "Oficial" text on a colored pill** (gold or brand color)
- In the **card list**: badge overlay on the card image only
- In the **seminar detail**: same badge overlay on the detail image **plus a dedicated text mention** in the info section (e.g. a chip/line stating the seminar is officially endorsed by Spain Aikikai)
- Note: Phase 3 will upgrade this to a full seal overlaid on the cover photo — the Phase 2 badge should be designed so Phase 3 can supersede it without conflict

### Post-payment Return Flow
- After Redsys (payment completed **or cancelled**), Redsys redirects back to the **seminar detail page** — not a separate result page
- While waiting for the webhook to confirm: the "Solicitar Oficialidad" button shows a **"Procesando pago…" pending state**; page polls or auto-refreshes until the status updates
- If the user **cancelled** on Redsys: neutral info toast "Pago cancelado" — no alarm, button remains available to retry
- When the webhook confirms and the seminar switches to official: **page auto-updates** (badge appears, button state changes) + **green success toast** (e.g. "¡Seminario oficial!")

### Price Configuration
- The oficialidad price lives in the **existing "Configuración de Precios" panel** — same page and same UI pattern as other prices (no new dedicated section needed)
- Backend needs a **new category** added to `PriceConfiguration.VALID_CATEGORIES` (e.g. `"seminar"` or `"oficialidad"`) with key `"oficialidad_seminar"` or similar — exact naming is Claude's discretion
- Edit pattern follows existing system: **inline edit** (value shown as text, clicking Edit turns it into an input, Save/Cancel appear) — this is already how the form works via `PriceConfigurationForm`
- Just the **current price** displayed — no history, no audit log in v1
- Price takes effect **immediately** for the next payment initiation

### Claude's Discretion
- Exact key and category name for the oficialidad price in `PriceConfiguration` (suggest `category="seminar"`, `key="oficialidad_seminar"`)
- Color/icon specifics for the badge pill (gold yellow suggested)
- Polling interval or WebSocket strategy for detecting webhook confirmation
- Redsys order reference format for seminar payments (to distinguish from license payments)
- Idempotency key design for the webhook handler

</decisions>

<specifics>
## Specific Ideas

- The badge overlay pattern (Phase 2) is a **stepping stone** to Phase 3's seal overlay — keep it positioned top-right so Phase 3 can replace it with the full seal in the same spot
- The "Procesando pago…" pending state should be visually distinct from the normal "Solicitar Oficialidad" button — grey/disabled appearance with a spinner
- The existing Redsys integration (`redsys_service.py`) and payment flow (used for license payments) is the reference — the seminar payment should reuse the same service adapter

</specifics>

<design_guidelines>
## UI/UX Design Guidelines (from ui-ux-pro-max)

### Component Choices (shadcn stack)
- Use **`<Dialog><DialogContent>`** for the confirmation modal — not `<Alert>` styled as modal (HIGH)
- Confirm button: `disabled={isLoading}` + spinner icon during async call — prevent double-submission (HIGH)
- Error inside modal: use `role="alert"` or `aria-live="polite"` — not just a red border (HIGH)
- Error state must include a **"Try again" path** — error message alone is not enough (MEDIUM)
- Success toast is required — never silent on state change (MEDIUM)

### Badge Overlay Implementation
- Use `position: absolute` on the badge, `position: relative` on the image container (Dimensional Layering pattern)
- Badge z-index: use a defined scale (e.g. `z-10`) so Phase 3 seal can layer above at `z-20`
- Status color for "Oficial" pill: `#22C55E` (green) or amber/gold — must meet 4.5:1 contrast against badge background

### Accessibility Checklist for This Phase
- [ ] Modal trap focus while open; restore focus on close
- [ ] All icon-only buttons have `aria-label`
- [ ] "Procesando pago…" pending state announced via `aria-live`
- [ ] Badge image overlay has `aria-label` or `title` for screen readers
- [ ] `cursor-pointer` on "Solicitar Oficialidad" button and any clickable card area

</design_guidelines>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-oficialidad-payment-flow*
*Context gathered: 2026-02-27*
