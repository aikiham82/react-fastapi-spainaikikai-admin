# Excel → Production Sync Design

**Date:** 2026-04-17
**Source:** `/home/abraham/Descargas/Adaptación envio datos ASA 2025-2026 a subidas a APP.xlsx`
**Target:** MongoDB production `spainaikikai` database

## Problem

Production data is outdated for season 2025-2026. ASA provided an Excel file with 527 active members, their licenses/grades, insurance policies, and fees. Need to sync this authoritative data into production without corrupting existing records.

## Excel Inventory

| Sheet | Rows | Purpose |
|-------|------|---------|
| `2026` | 527 | Master: fees (cuota anual, seguro accidentes, seguro RC) per member |
| `2026 SIN SUMA CUOTAS` | 523 | Same as above without totals, cleaner for parsing |
| `MIEMBROS APP CON NOMBRE CLUB` | 527 | Member data formatted for app (Club ID = MongoDB ObjectId) |
| `Seguro de accidentes APP` | 370 | Insurance policies prepared for upsert |

## Production State

| Collection | Docs | Role |
|-----------|------|------|
| `clubs` | 53 | 52 active clubs (Club IDs match Excel) |
| `members` | 1161 | Union of historical + current members |
| `licenses` | 1088 | License records per member |
| `insurances` | 17 | Very sparse — needs population |
| `member_payments` | 57 | Very sparse — needs population |
| `transactions` | ~few | Redsys gateway only (skip for Excel) |

## Matching Analysis Results

Ran matching Excel (527 rows) vs prod members (1161):

- **276 matched by DNI** (52%)
- **111 matched by fuzzy name + club_id** (21%)
- **140 unmatched** (27%)
  - 32 with empty `club_id` in Excel
  - 30 ROSERAIE VALENCIA (name mismatch with prod)
  - 33 have DNI (new members)
  - 45 scattered across other clubs

## Known Data Issues

### Excel-side
- `TAIO` rows with `club_id=6985f6004dca105b754e6c6b` must remap to `...6c86` (that ID is Roseraie España).
- 32 rows with empty `club_id` / `club_name`.
- 7 non-standard DNIs (e.g., `"0"`, `"AAC022176"`).
- 189 rows without DNI AND without birth date (limited matching).
- Duplicate club names: `HEIJOSHIN` vs `DOJO HEIJOSHIN` (same ID, OK), `TAIO` vs `Asociacion Sociocultural Taio`, `SENKIKAI SVM` variants.

### Prod-side
- 142 member names with corrupted accents (`Martnez` missing `í`).
- Birth dates with future years (`2064-09-25` should be `1964-09-25`) — Excel-to-Mongo parsing bug from old migration.
- Many `dni: ""` empty strings.
- `last_name` concatenates first + second surname (needs respect when matching).

## Strategy

### 1. Script: `backend/scripts/sync_excel_to_prod.py`

- Two modes: `--dry-run` (default) and `--execute`.
- Uses Motor async driver with same config as backend (`src/infrastructure/adapters/mongo_config.py`).
- Read Excel once, parse all sheets into memory.
- Load prod members + existing licenses/payments/insurances via queries.
- Build matching index, resolve actions, report/execute.

### 2. Matching (per member)

```
Level 1: DNI normalized → prod DNI exact match
Level 2: fuzzy_name(first + last1 + last2) + club_id → prod (first + last) + club
Level 3: No match → INSERT as new member
```

**DNI normalization**: strip `.`, `-`, whitespace, uppercase. Drop DNIs that are `"0"` or empty.

**Fuzzy name normalization**: NFKD decompose + strip combining chars + strip non-alpha + uppercase. Handles both Excel uppercase and prod corrupted accents consistently.

### 3. Pre-match corrections

- TAIO remap: if `club_name == "TAIO"` and `club_id == "6985f6004dca105b754e6c6b"` → set `club_id = "6985f6004dca105b754e6c86"`.
- Empty DNI substitutes `"0"` → treat as empty.
- Empty `club_id` → skip (log to warnings, can't assign).
- Prod birth dates where `year >= 2026` → correct to `year - 100` before comparing or persisting.

### 4. Upserts by collection

**`members`**: Match found → update only non-empty Excel fields (preserve prod data when Excel is blank). Match missing → insert new with `status="active"`, `club_role="member"`. Add new field `member_number` (nº socio from Excel) for future sync.

**`licenses`**: Upsert by `member_id`. Update `license_type`, `grade`, `technical_grade`, `instructor_category`, `age_category`, `expiration_date=2026-12-31`, `status="active"`.

**`insurances`**: Upsert by `(member_id, insurance_type, year)`. Two types per member (if applicable): `accident` (seguro_accidentes), `civil_liability` (seguro_rc). `start_date=2026-01-01`, `end_date=2026-12-31`, `status="active"`.

**`member_payments`** (the priority): Upsert by `(member_id, payment_year=2026, payment_type)`. Per member, up to 3 records:
- `payment_type="licencia_kyu"` or `"licencia_dan"`, `amount=cuota_anual`, `concept=f"{payment_type} - 2026"`
- `payment_type="seguro_accidentes"`, `amount=seguro_accidentes`, `concept="seguro_accidentes - 2026"`
- `payment_type="seguro_rc"`, `amount=precio_rc_from_config`, only if Excel col `Seguro RC == "RC"`

All with `status="completed"` (data is authoritative from ASA).

### 5. Dry-run report

Writes `exports/sync_report_YYYY-MM-DD.json`:

```json
{
  "summary": {
    "members": {"matched_dni": N, "matched_name": N, "new": N, "skipped": N},
    "member_payments": {"created": N, "updated": N, "skipped": N},
    "insurances": {"created": N, "updated": N},
    "licenses": {"created": N, "updated": N}
  },
  "warnings": [...],
  "skipped": [...],
  "actions": [...]
}
```

Also prints human-readable summary to stdout.

### 6. Execution

`--execute` flag triggers actual writes, in order: `members → licenses → insurances → member_payments`. Logs every write to `exports/sync_execution_YYYY-MM-DD.log` with member_id + action for manual rollback if needed.

## Safety

- Dry-run is default; must explicitly pass `--execute`.
- No deletions (upsert-only).
- Empty Excel fields do not overwrite prod values.
- Existing prod members not in Excel are untouched.
- Full JSON audit trail per run.
- Recommend taking a MongoDB dump before `--execute`.

## YAGNI Exclusions

- No `transactions` records (those are Redsys payment gateway, not Excel).
- No club creation/update (Excel matches existing clubs).
- No retroactive cleanup of corrupted prod birth dates (separate task).
- No accent correction on prod names (separate task).
- No handling of members in prod but not in Excel (they stay active).

## Out-of-scope Items to Address Separately

1. Fix prod corrupted accents (142 names) — needs another Excel or manual review.
2. Fix prod birth dates with future years — can be derived (if year > 2025, subtract 100).
3. Clean up 32 Excel rows with empty club — ask ASA for correct club assignments.
4. Resolve ROSERAIE naming split (Excel `ROSERAIE VALENCIA` vs prod `Roseraie España`).

## Acceptance Criteria

- Dry-run output counts match expected: ~387 matched members, ~140 new, ~1300+ member_payments created.
- No member updates when Excel row has all blank fields.
- No duplicate member_payments for same (member_id, year, type).
- Script runs in <2 minutes against prod.
- Re-running `--execute` is idempotent (upsert).
