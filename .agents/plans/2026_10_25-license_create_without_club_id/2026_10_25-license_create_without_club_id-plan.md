---
name: "Create a licence without club_id and with its categories"
description: "Creating a licence (form and Excel import) answers 500 because club_id was removed from License; also store the technical grade, instructor category and age category it is created with."
created_at: "2026-10-25T16:30:00Z"

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

last_implementation_at: "2026-10-25T16:45:00Z"
has_completed_all_phases: "true"
---

# Create a licence without club_id and with its categories

## Goal

`POST /api/v1/licenses` and the licence Excel import create licences again, storing the technical grade, instructor category and age category they are given.

## Context

- Root cause: `club_id` was removed from `License` (the club comes from the member), but [`CreateLicenseUseCase`](../../../backend/src/application/use_cases/license/create_license_use_case.py) still passes `club_id=` to `License` (`TypeError`), and [`licenses.py:311`](../../../backend/src/infrastructure/web/routers/licenses.py) reads `license_data.club_id`, which `LicenseCreate` no longer has (`AttributeError`). Both answer 500. Found by QA on 2026-10-25.
- The use case never passed `technical_grade`, `instructor_category` or `age_category`, so a created licence would always be kyu / none / adulto whatever the form or the Excel row said.
- Callers: [`licenses.py` `create_license`](../../../backend/src/infrastructure/web/routers/licenses.py) and [`import_export.py` licence import](../../../backend/src/infrastructure/web/routers/import_export.py).
- Docs: [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`docs/domain/roles-and-permissions.md`](../../../docs/domain/roles-and-permissions.md).

### Real data matrix

Read-only production query on `licenses` (technical_grade / instructor_category / age_category: count): kyu/none/adulto 586, dan/none/adulto 295, kyu/none/infantil 214, dan/shidoin/adulto 51, dan/fukushidoin/adulto 27, kyu/shidoin/adulto 12, dan/none/infantil 5, dan/shidoin/infantil 4, plus singletons. `license_type` equals `technical_grade` except two legacy `instructor` rows.

### Out of scope

The licence import still reads `dni` and `license_number` cells raw (numbers are not turned into text). Separate branch.

## Phases

### Phase 1: create a licence with its categories

- [x] `CreateLicenseUseCase.execute`: drop `club_id`; add optional `technical_grade`, `instructor_category`, `age_category` (defaults kyu / none / adulto); `license_type` follows `technical_grade` when given.
- [x] `POST /api/v1/licenses` stops reading `club_id` and passes the three categories.
- [x] The licence import stops passing `club_id` and passes the three categories it already validates.
- [x] Test suite `backend/tests/application/use_cases/license/test_create_license_use_case.py`:
  - `test_a_licence_is_created_with_its_categories`
  - `test_a_licence_without_categories_defaults_to_kyu_adult`
- [x] Test suite `backend/tests/api/test_licenses_create.py`:
  - `test_a_super_admin_creates_a_licence_with_its_categories`
  - `test_a_club_admin_cannot_create_a_licence`
  - `test_a_licence_import_row_stores_its_categories`
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases are implemented; next is review, QA and merge.

Licences back on the mat, belts in the right colour 🥋 ← 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
