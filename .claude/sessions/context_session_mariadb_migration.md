# Session Context: MariaDB to MongoDB Migration

## Status: Implementation Complete - Ready for Live Execution

## Overview

Migration of production data from legacy Laravel/Voyager system (MariaDB) to new FastAPI/React system (MongoDB).

## Design Document

Full design at: `docs/plans/2026-02-06-mariadb-to-mongodb-migration-design.md`

## Key Decisions

1. **Clean import** - MongoDB only has seed data, will be cleared
2. **Big Bang strategy** - Small dataset (~1,300 records), single execution
3. **Password migration** - `$2y$` → `$2b$` hash conversion
4. **Smart name splitting** - Spanish compound name detection
5. **Auto-generate licenses** - From member data (id → license_number)
6. **Don't migrate payments** - Start fresh
7. **Auto-parse addresses** - Regex for Spanish address formats

## Implementation Summary

### Dependencies Added
- `pymysql` (pure Python MySQL/MariaDB connector) - added as dev dependency
- Note: `mysql-connector-python` and `mariadb` C connector were incompatible with the environment

### Script Created
- **File**: `backend/scripts/migrate_from_mariadb.py`
- **Pattern**: Follows `backend/scripts/seed_demo_data.py` conventions
- **MariaDB**: Sync connection via PyMySQL (read-only)
- **MongoDB**: Async via Motor

### Utility Functions Implemented
- `parse_spanish_name()` - Spanish compound name detection (35+ patterns)
- `parse_spanish_address()` - Regex-based address parsing for Spanish formats
- `normalize_rank()` - KIU/KUY → KYU correction
- `derive_instructor_category()` - From fukushidoin/shidoin flags
- `convert_password_hash()` - Laravel $2y$ → Python $2b$
- `format_grade()` - "1er Dan", "2º Dan", "6º Kyu" formatting
- `clean_phone()` - Handle None and literal "null" strings
- `to_naive_datetime()` - Convert date/datetime to naive UTC

### Migration Functions
1. `migrate_clubs()` - Joins clubs + users(role=2), parses addresses → 53 clubs
2. `migrate_members()` - Smart name split, club_id mapping, admin detection → 1105 members
3. `migrate_licenses()` - Generated from member rank data → 1072 licenses
4. `migrate_users()` - Password hash conversion, role mapping, member linking → 165 users
5. `migrate_seminars()` - Basic mapping with club_id → 2 seminars

### Validation Suite
- `verify_counts()` - Compare MariaDB vs MongoDB counts
- `verify_relationships()` - Check referential integrity (club_id, member_id)
- `verify_samples()` - Spot-check random records

### CLI Modes
- `--dry-run` - Simulate without writing
- `--run` - Execute real migration + validation
- `--validate-only` - Only run validations

## Dry-Run Results (2026-02-06)

```
Clubs:    53
Members:  1105
Licenses: 1072
Users:    165 (1 super_admin, 95 linked to members)
Seminars: 2
```

All counts match MariaDB source data. Only 1 warning: member "GABRIEL" has single-word name (no last name).

## Source Data Summary (MariaDB)

| Table | Records | Notes |
|-------|---------|-------|
| clubs | 53 | Name comes from users table (role=2) |
| members | 1,105 | id=license_number, single name field |
| users | 165 | Roles: 1=admin(1), 2=club(55), 3=member(106), null(3) |
| seminars | 2 | Minimal data |
| payments | 37 | NOT migrating |
| online_payments | 1 | NOT migrating |

## Next Steps

- [ ] Execute migration: `poetry run python scripts/migrate_from_mariadb.py --run`
- [ ] Validate: `poetry run python scripts/migrate_from_mariadb.py --validate-only`
- [ ] Manual test: Start backend + frontend, login with migrated admin account
- [ ] Spot checks: Verify club names, member name splits, license numbers

## Connection Details

- MariaDB: `localhost:3306`, user: `spainaikikai`, db: `spainaikikai`
- MongoDB: configured via env vars, db: `spainaikikai`
