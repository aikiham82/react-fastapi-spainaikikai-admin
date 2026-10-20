---
name: "Member selector search starts empty"
description: "The Asignar Miembros a Pagos dialog clears its search whenever it opens, whichever way it was closed."
created_at: "2026-10-20T14:00:00Z"

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
last_implementation_at: "2026-10-20T14:10:00Z"
has_completed_all_phases: true
---

# Member selector search starts empty

## Goal

After "Confirmar Seleccion" the member selector kept its search text, so reopening it showed a filtered list. The search must be empty every time the dialog opens.

## Context

- Root cause: [`MemberSelectionTable.tsx`](../../../frontend/src/features/member-payments/components/MemberSelectionTable.tsx) clears `searchTerm` only in `handleClose`; `handleConfirm` closes through `onClose()` directly. The reset depends on how the dialog was closed.
- The component already resets its assignments when it opens (`if (isOpen !== wasOpen)`); the search reset belongs there.
- Not tenant data dependent; the variety is the way the dialog closes: Confirmar, Cancelar, Escape, close button.

## Phases

### Phase 1: the search is empty on every open

- [x] Test suite `MemberSelectionTable.test.tsx`: `opens with an empty search after confirming a filtered selection`.
- [x] Clear the search in the open reset block; `handleClose` is gone, the dialog and "Cancelar" call `onClose` directly.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented.

A fresh search every time, swept clean by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
