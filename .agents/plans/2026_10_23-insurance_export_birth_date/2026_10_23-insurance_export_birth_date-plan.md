---
name: "Birth date in the insurance export"
description: "The Exportar Seguros Excel gains a Fecha Nacimiento column taken from the member."
created_at: "2026-10-23T10:40:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Birth date in the insurance export

## Goal

The federation asked for the member's birth date in the accident insurance download. The `Exportar Seguros` Excel must carry a `Fecha Nacimiento` column.

## Context

- Export: `GET /api/v1/import-export/insurances/export` in [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py); column picker `INSURANCE_COLUMNS` in [`ImportExportPage.tsx`](../../../frontend/src/features/import-export/components/ImportExportPage.tsx).
- `Member.birth_date` already exists; the members export formats it as `dd/mm/YYYY`, empty when missing. Same format here.
- No switch already provides it: the export has no birth date path.
- Real varieties in production (read-only): accident 366 with birth date / 111 without; civil liability 323 / 114. Test cases: member with birth date → `dd/mm/YYYY`; member without → empty cell.

## Contracts

- `GET /insurances/export`: new column key `birth_date`, header `Fecha Nacimiento`, right after `DNI`. Included by default.
- UI copy: `Fecha Nacimiento`.
- Test suite `tests/api/test_insurances_export.py`: `the export carries the member birth date`, `a member without birth date exports an empty cell`.

## Phases

### Phase 1: Fecha Nacimiento column in the insurance export

- [ ] Test suite `test_insurances_export.py` with both cases, red first.
- [ ] Add `birth_date` to the insurance row and registry; add it to `INSURANCE_COLUMNS`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement phase 1.
