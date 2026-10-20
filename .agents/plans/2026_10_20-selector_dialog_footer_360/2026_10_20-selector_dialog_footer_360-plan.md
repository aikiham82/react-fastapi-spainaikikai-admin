---
name: "Member selector dialog footer always visible"
description: "The Asignar Miembros a Pagos dialog keeps Cancelar and Confirmar visible on small screens by letting its table shrink and scroll."
created_at: "2026-10-20T13:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
last_implementation_at: "2026-10-20T13:20:00Z"
has_completed_all_phases: true
---

# Member selector dialog footer always visible

## Goal

At 360x740 the "Cancelar" and "Confirmar Seleccion" buttons of the member selector dialog fall outside the dialog and the screen. The footer must always be visible, with the table scrolling instead.

## Context

- Root cause: [`MemberSelectionTable.tsx`](../../../frontend/src/features/member-payments/components/MemberSelectionTable.tsx) gives `DialogContent` (a fixed CSS grid, [`dialog.tsx:64`](../../../frontend/src/components/ui/dialog.tsx)) `max-h-[90vh] overflow-hidden`, while its table has a fixed `h-[400px]`. Header, wrapped badges, search, legend, table and footer add up to more than 90vh on a phone, and the overflow clips the footer.
- Existing project pattern: [`ManualPaymentModal.tsx:177`](../../../frontend/src/features/club-payments/components/ManualPaymentModal.tsx) uses `max-h-[90vh] flex flex-col` with a `flex-1 overflow-y-auto` body and a footer always visible.
- Docs: [`docs/conventions/frontend.md`](../../../docs/conventions/frontend.md).

### Viewport matrix

Not tenant data dependent; the variety is the viewport.

| Viewport | Expected |
|---|---|
| 360x740 | Footer visible, table scrolls |
| 390x844 | Footer visible, table scrolls |
| 1280x800 | Unchanged, table about 400px |
| 1280x600 | Footer visible, table shrinks |

## Phases

### Phase 1: the footer stays visible

- [x] `DialogContent` gets `flex flex-col`; the table container drops the fixed height for `min-h-0 flex-1 overflow-auto` capped at 400px on desktop.
- [x] Screenshots for every row of the viewport matrix (jsdom does not compute layout, so a class assertion would prove nothing). Before: at 360x740 "Confirmar" ended at y=754. After, with 33 members: 360x740 y=634, 390x844 visible, 1280x800 y=711 (table 400px as before), 1280x600 y=545.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented.

Buttons within reach on every phone, courtesy of 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
