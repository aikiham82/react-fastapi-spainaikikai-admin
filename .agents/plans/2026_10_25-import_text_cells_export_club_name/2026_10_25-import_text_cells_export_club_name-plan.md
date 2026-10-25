---
name: "Import text cells and export the club name"
description: "Store numeric Excel cells as text on member import and write the club name instead of its id in the member, licence and insurance exports."
created_at: "2026-10-25T12:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Import text cells and export the club name

## Goal

The member import stores every text field as a string, whatever the Excel cell type, and the member, licence and insurance exports show the club name instead of its id while export then import keeps working.

## Context

- Production incident 2026-10-23: a Shoshin Dojo import stored `postal_code` as the int `23001`. `MemberResponse.postal_code` is `Optional[str]`, so pydantic raised `string_type` and every member list containing that member returned 500, including the super admin list. Data fixed in production; the code still lets it happen.
- [`backend/src/infrastructure/web/routers/import_export.py`](../../../backend/src/infrastructure/web/routers/import_export.py): `import_members` reads row fields at lines 82-93 without casting; `MEMBERS_COLUMN_REGISTRY` writes `club_id` as "Club ID" (line 279); licences (line 368) and insurances (line 456) write `member.club_id` under "Club". `export_payments` (lines 807-841) already maps club ids to names with `club_repo.find_all()`.
- [`backend/src/infrastructure/web/dto/import_export_dto.py`](../../../backend/src/infrastructure/web/dto/import_export_dto.py): `ImportMembersRequest.members: List[dict]`, so values are untyped.
- [`frontend/src/features/import-export/components/ImportExportPage.tsx`](../../../frontend/src/features/import-export/components/ImportExportPage.tsx): SheetJS `sheet_to_json` sends numeric cells as numbers; column selector label "Club ID" at line 39.
- Tests to follow: [`backend/tests/api/test_members_import_club_scoping.py`](../../../backend/tests/api/test_members_import_club_scoping.py), [`backend/tests/api/test_insurances_export.py`](../../../backend/tests/api/test_insurances_export.py).
- Docs: [`docs/conventions/backend.md`](../../../docs/conventions/backend.md), [`docs/testing/fixtures-are-real-entities.md`](../../../docs/testing/fixtures-are-real-entities.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md).

### Real data matrix

Read-only production query on `members` field types: `postal_code` string / int (1, fixed) / null; `phone` string / null; `dni` string / null. Test cases: numeric postal code, numeric phone, numeric dni, four-digit postal code that lost its leading zero, empty cell.

### Out of scope

Real Excel date cells arrive as serial numbers and the birth date is silently dropped. Pre-existing, separate branch.

## Phases

### Phase 1: the member import stores text

Normalise every text field read from an import row: an integral number becomes its digits, a postal code shorter than five digits gets its leading zeros back.

- [ ] Test suite `backend/tests/api/test_members_import_text_cells.py`:
  - `test_a_numeric_postal_code_is_stored_as_text`
  - `test_a_four_digit_postal_code_gets_its_leading_zero_back`
  - `test_numeric_phone_and_dni_are_stored_as_text`
  - `test_an_upsert_with_a_numeric_postal_code_stores_text`
- [ ] Normalise the row text fields in `import_members`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: the exports show the club name

Members, licences and insurances exports write the club name under "Club". The member import accepts a "Club" column holding a club name and resolves it to its id, keeps accepting "Club ID", and rejects a row naming an unknown club with "Club no encontrado".

- [ ] Tests:
  - `test_members_export_writes_the_club_name`
  - `test_licences_export_writes_the_club_name`
  - `test_insurances_export_writes_the_club_name`
  - `test_a_row_naming_a_club_lands_in_that_club`
  - `test_a_row_naming_an_unknown_club_is_rejected`
- [ ] Inject the club repository in the three exports and the import, map id to name.
- [ ] Frontend column selector label "Club ID" becomes "Club".
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

Implement Phase 1.

Plan powered by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
