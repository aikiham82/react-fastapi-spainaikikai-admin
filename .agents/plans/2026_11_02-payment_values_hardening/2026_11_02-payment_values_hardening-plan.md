---
name: "Payment values hardening"
description: "Refuse Infinity and NaN on every money input, export error-looking text as text and validate the imported payment concept."
created_at: "2026-11-02T17:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "medium"

last_implementation_at: "2026-11-02T17:30:00Z"
has_completed_all_phases: "true"
---

# Payment values hardening

## Goal

A club admin can no longer break global listings with a non-finite number, an export can no longer carry a fake error cell, and an imported concept is always bounded text.

## Context

- Request DTOs in [`backend/src/infrastructure/web/dto/`](../../../backend/src/infrastructure/web/dto) type money as `float`, which accepts `Infinity`, `NaN` and `1e400`. Those values are stored, then every JSON response containing them answers 500 (reproduced in QA).
- `pydantic.FiniteFloat` refuses them, but FastAPI then answers 500 too: its default 422 echoes the input and `JSONResponse` cannot render it (reproduced with a probe). So [`src/app.py`](../../../backend/src/app.py) needs a validation handler without `input`.
- [`import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): three `float(...)` parses of `monto` and coverage; `_build_excel` protects only `data_type == "f"`; `concepto` skips `_cell_text`.
- Docs: [`excel-import-cells-are-text.md`](../../../docs/conventions/excel-import-cells-are-text.md), [`security-guidelines.md`](../../../docs/security/security-guidelines.md).
- No switch hides any of this.

### Real data matrix (read-only production query, 2026-11-02)

| Variety | Production | Case |
|---|---|---|
| `member_payments.amount` | 1104 numbers, up to 100 | 15.5 and 0 accepted; Infinity, -Infinity, NaN, 1e400 refused |
| `insurances.coverage_amount` | 79 null, others 10 to 15 | null still accepted |
| `price_configurations.price`, `seminars.price` | 5 to 100, 0 to 75 | Normal values accepted |
| `concept` | All text, longest 28 | Number cell becomes text; over 200 refused for the row |

| `transactions.amount` (the parent payments) | 79 numbers, 0 to 1950 | Stays under the `Money` limit of 1,000,000 added after review |

No data to repair.

## Phases

### Phase 1: non-finite numbers are refused

Public contracts:
- Every money field of a request DTO becomes `FiniteFloat`: 422 instead of a stored value.
- HTTP validation errors: `detail` keeps `type`, `loc` and `msg`, and no longer carries `input`.
- Import of payments and insurances: a non-finite `monto` is an error for its row; a non-finite coverage is treated like an invalid one.
- Test cases: each request DTO refuses the values in the matrix and accepts normal ones; a request with `Infinity` answers 422 through the app; the body does not echo the input; import refuses `inf`.

To-do:
- [x] Write the failing tests.
- [x] Apply `FiniteFloat`, the handler and the import parser.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`, and `npm run lint && npm run build && npx vitest run` if the frontend reads `input`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: error-looking text exports as text

Public contracts:
- `_build_excel`: text such as `#REF!` or `#N/A` is stored as text, not as an error cell.
- Test cases: both values read back as text; formulas stay text.

To-do:
- [x] Write the failing tests.
- [x] Extend the guard.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: the imported concept is bounded text

Public contracts:
- `POST /import-export/payments/import`: `concepto` goes through `_cell_text`; over 200 characters is an error for its row.
- Spanish copy: "Fila N: Concepto demasiado largo".
- Test cases: a number cell is stored as text; 200 characters accepted; 201 reported as a row error and not stored.

To-do:
- [x] Write the failing tests.
- [x] Validate the concept.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`poetry run pytest`). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are complete.

Every value in its place thanks to 📏 🧾 ♾️ 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
