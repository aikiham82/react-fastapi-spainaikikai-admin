---
name: "Payment edit and export fixes"
description: "A control character no longer breaks the Excel exports, an empty amount is no longer saved as 0 and opening the payment line editor no longer focuses the year."
created_at: "2026-11-02T16:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"
---

# Payment edit and export fixes

## Goal

Stop three defects found in QA: one text with a control character takes the export down for everyone, clearing the amount saves a line at 0 € with no warning, and opening the editor focuses the year.

## Context

- [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): `_build_excel` writes each extractor value straight into a cell; `openpyxl` raises `IllegalCharacterError` on control characters (reproduced). Members, licences, insurances and payments all go through it.
- [`member_payment_dto.py`](../../../backend/src/infrastructure/web/dto/member_payment_dto.py): `MemberPaymentUpdateRequest.concept` has no limit (5 MB accepted in QA).
- [`MemberPaymentEditModal.tsx`](../../../frontend/src/features/club-payments/components/MemberPaymentEditModal.tsx): `Number('')` is 0 and passes `min(0)`.
- [`dialog.tsx`](../../../frontend/src/components/ui/dialog.tsx): focuses the first text field unless the dialog prevents it. [`AccountMenu.tsx`](../../../frontend/src/components/AccountMenu.tsx) already moves the focus to the container.
- No switch hides any of this.

### Real data matrix (read-only production query, 2026-11-02)

| Variety | Production | Case |
|---|---|---|
| `concept` length | Longest of 1104 lines is 28 | 200 accepted, 201 refused |
| Control characters in `concept` | None | Stripped in any export column; tab and line break are valid and stay |
| Completed lines at 0 € | None, and no line at 0 € of any status | Empty amount refused; an explicit 0 still saved |

No data to repair.

## Phases

### Phase 1: exports survive a control character

Public contracts:
- `_build_excel`: same signature; text cells lose the characters Excel cannot store.
- `PUT /member-payments/{id}`: `concept` longer than 200 characters answers 422.
- Test cases: a value with a control character exports without it; tab, line break and non-text values stay; 200 characters accepted and 201 refused.

To-do:
- [ ] Write the failing tests.
- [ ] Strip the characters in `_build_excel` and limit `concept`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: an empty amount is not 0

Public contracts:
- Spanish copy: "Indica el importe" under the amount field.
- Test cases: an empty amount shows the error and does not call the mutation; an explicit 0 is saved.

To-do:
- [ ] Write the failing tests.
- [ ] Refuse the empty amount.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`npm run lint && npm run build && npx vitest run`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: opening the editor focuses the dialog

Public contracts:
- Test cases: on open, the focus is on the dialog and not on any field.

To-do:
- [ ] Write the failing test.
- [ ] Move the focus to the dialog.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`npm run lint && npm run build && npx vitest run`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Sturdier payments on the way from 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
