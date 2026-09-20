# Session Context: Fix License Grade Display Bug

## Problem
After migration from MariaDB, license grades display incorrectly in the UI. Kyu licenses show as "Dan N" instead of "Nº Kyu". Example: "6º Kyu" in DB shows as "Dan 6" in the UI.

## Investigation Results

### Data is CORRECT in MongoDB (both local and production)
| License # | grade (DB) | technical_grade (DB) | Displayed As (BUG) |
|-----------|-----------|---------------------|---------------------|
| 2000796 | 6º Kyu | kyu | Dan 6 |
| 2000795 | 6º Kyu | kyu | Dan 6 |
| 3941 | 6º Kyu | kyu | Dan 6 |
| 2000605 | 6º Kyu | kyu | Dan 6 |
| 2000767 | 6º Kyu | kyu | Dan 6 |
| 2000793 | 6º Kyu | kyu | Dan 6 |
| 2706 | 4º Kyu | kyu | Dan 4 |

### Root Cause Chain

**1. Backend `dan_grade` computed field** (`backend/src/infrastructure/web/dto/license_dto.py:82-90`):
- Extracts number from ANY grade string using regex `r'(\d+)'`
- "6º Kyu" → `dan_grade = 6` (should only extract for Dan grades, or field should be renamed)

**2. Frontend `getGradeDisplay()`** (`frontend/src/features/licenses/components/LicenseList.tsx:16-21`):
- Only checks `dan_grade > 0` → shows "Dan 6" for ANY license with a number in grade
- Never checks `technical_grade` field which correctly stores "kyu" vs "dan"

**3. Backend `_get_grade_string()`** (`backend/src/infrastructure/web/routers/licenses.py:63-69`):
- When creating NEW licenses: `dan_grade > 0` → always creates "N Dan" string
- No way to create "Nº Kyu" from the form

**4. Frontend Form** (`frontend/src/features/licenses/components/LicenseForm.tsx:159-177`):
- Only offers "Kyu (0)" or "Nº Dan" — no Kyu level selection
- Default `dan_grade: 6` means default is 6º Dan (should be something reasonable)

### Related Code Using `technical_grade` Correctly
- `MemberSelectionTable.tsx:85-86`: Uses `ls.technical_grade === 'dan'/'kyu'` — CORRECT
- `ImportExportPage.tsx:415-419`: Uses `technical_grade` for filtering — CORRECT

### Files to Modify
1. `frontend/src/features/licenses/components/LicenseList.tsx` — Fix `getGradeDisplay()`
2. `backend/src/infrastructure/web/dto/license_dto.py` — Rename/fix `dan_grade` computed field
3. `frontend/src/features/licenses/components/LicenseForm.tsx` — Fix form to support Kyu levels
4. `backend/src/infrastructure/web/routers/licenses.py` — Fix `_get_grade_string()` and `_get_sort_key()`
5. `frontend/src/features/licenses/data/schemas/license.schema.ts` — Update schema if needed

## Plan Status
- [x] Phase 1: Investigation complete
- [ ] Phase 2: Design
- [ ] Phase 3: Implementation
- [ ] Phase 4: QA Validation
