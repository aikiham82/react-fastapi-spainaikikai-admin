# Context Session: Database Migration (MariaDB → MongoDB)

## Session Status: PHASE 4 - MIGRATION COMPLETE ✅

## Objective
Migrate all data from legacy MariaDB relational database (Laravel/Voyager) to the existing MongoDB document-based system, ensuring data integrity, consistency, and completeness.

## Final Results

### Migration Summary
| Collection | Source Count | Target Count | Status |
|------------|-------------|--------------|--------|
| clubs | 53 | 53 | ✅ |
| members | 1105 | 1105 | ✅ |
| users | 165 | 165 | ✅ |
| seminars | 2 | 2 | ✅ |
| licenses | - | 1072 | ✅ (derived) |
| insurances | - | 339 | ✅ (derived) |
| payments | 37+1 | 38 | ✅ |
| member_payments | - | 38 | ✅ (derived) |

### Migration Duration
- Total time: ~2 seconds
- Executed at: 2026-02-03 12:26:49

### Validation Results
- **Counts**: PASSED ✅
- **Referential Integrity**: PASSED ✅
- **Data Quality**: PARTIAL (4 invalid emails in source data)

### Known Issues (Resolved)
1. **Email unique index on members**: Some members have empty emails, preventing unique index creation
2. ~~**Invalid user emails**: 4 users have invalid emails~~ → **FIXED** (2026-02-04): Cleaned 5 invalid emails by removing the email field, recreated email index as sparse unique
3. **Payment types table**: Different schema than expected, but payment data migrated successfully

---

## Implementation Details

### Files Created
```
migration/
├── src/
│   ├── __init__.py
│   ├── config.py              # DB connections config
│   ├── extractors/
│   │   ├── __init__.py
│   │   ├── base_extractor.py  # MariaDB connection handler
│   │   ├── clubs_extractor.py
│   │   ├── members_extractor.py
│   │   ├── payments_extractor.py
│   │   ├── users_extractor.py
│   │   └── seminars_extractor.py
│   ├── transformers/
│   │   ├── __init__.py
│   │   ├── base_transformer.py  # Utility functions
│   │   ├── clubs_transformer.py
│   │   ├── members_transformer.py
│   │   ├── licenses_transformer.py   # Derived from members
│   │   ├── insurances_transformer.py # Derived from members
│   │   ├── payments_transformer.py
│   │   ├── users_transformer.py
│   │   └── seminars_transformer.py
│   ├── loaders/
│   │   ├── __init__.py
│   │   └── mongodb_loader.py  # Batch loading with upsert
│   ├── validators/
│   │   ├── __init__.py
│   │   └── migration_validator.py
│   └── main.py                # Migration orchestrator
├── data/                      # Extracted/transformed JSON files
├── logs/                      # Migration logs
├── reports/                   # Validation reports
├── requirements.txt
├── venv/                      # Python virtual environment
└── test_extraction.py         # Test script
```

### Key Transformations Applied

#### Clubs
- `user_name` → `name` (from users table via JOIN)
- `user_email` → `email`
- `address` → parsed into `address`, `city`, `province`, `postal_code`

#### Members
- `name` → `first_name` + `last_name` (parsed)
- `identification_number` → `dni`
- `enrollment_date` → `registration_date`
- `id` (varchar) preserved as `legacy_id`

#### Licenses (Derived)
- Created from members with `level` and `rank` data
- `level` (number) + `rank` (KYU/DAN) → `grade` (e.g., "6_KYU", "5_DAN")
- `fukushidoin`/`shidoin` flags → `categoria_instructor`
- `birth_date` → `categoria_edad` (INFANTIL/JUVENIL/ADULTO/VETERANO)

#### Insurances (Derived)
- Created from members with `accident_payment` or `rc_payment` flags
- Generated policy numbers: `ACC-CLUB-YEAR-SEQ` or `RC-CLUB-YEAR-SEQ`

#### Payments
- Merged `payments` + `online_payments` tables
- `payment_type_id` → `payment_type` enum
- Preserved Redsys response data for online payments

#### Users
- Bcrypt password hashes preserved (compatible with FastAPI)
- Linked users to clubs via `clubs.user_id`

---

## How to Re-run Migration

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/migration
source venv/bin/activate

# Full migration (drops existing data!)
python -m src.main

# Dry run (extract + transform only)
python -m src.main --dry-run

# Skip extraction (use cached JSON)
python -m src.main --skip-extract

# Validation only
python -m src.main --validate-only
```

---

## MongoDB MCP Configuration
Updated `.mcp.json` to connect to correct database:
```json
"MongoDB": {
  "command": "docker",
  "args": [
    "run", "--rm", "-i", "-e",
    "MDB_MCP_CONNECTION_STRING=mongodb://spainaikikai_user:spainaikikai_password@host.docker.internal:27017/spainaikikai",
    "mongodb/mongodb-mcp-server:latest"
  ]
}
```

---

## Post-Migration Tasks
1. ✅ Data migrated successfully
2. ✅ Indexes created (with one warning on members.email)
3. ✅ ID mappings saved for audit trail
4. ✅ Clean up invalid user emails in MongoDB (5 records) - **COMPLETED 2026-02-04**
   - Removed email field from 5 users with invalid emails
   - Recreated `email_1` index as sparse unique (allows multiple missing emails)
5. 🔲 Test application functionality with migrated data
6. 🔲 Keep MariaDB available for 30 days for rollback capability

---

## Rollback Capability
- All documents have `legacy_id` field for traceability
- ID mappings stored in `id_mappings` collection
- Extracted JSON files saved in `migration/data/`
- MariaDB source data unchanged
