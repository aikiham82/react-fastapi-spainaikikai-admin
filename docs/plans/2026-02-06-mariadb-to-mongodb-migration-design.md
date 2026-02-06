# MariaDB to MongoDB Migration Design

**Date:** 2026-02-06
**Status:** Approved
**Type:** Data Migration

## Context

Migrating production data from the legacy Laravel/Voyager system (MariaDB) to the new FastAPI/React system (MongoDB). The MongoDB instance currently only has demo/seed data, making this a clean import.

## Source System (MariaDB)

### Tables & Volume

| Table | Records | Migrates? |
|-------|---------|-----------|
| `clubs` | 53 | Yes - combined with users(role=2) |
| `members` | 1,105 | Yes |
| `users` | 165 | Yes |
| `payments` | 37 | No - start fresh |
| `online_payments` | 1 | No - start fresh |
| `seminars` | 2 | Yes |
| `posts` | 0 | No - empty |
| `notifications` | 0 | No - empty |
| Framework tables (20+) | N/A | No - Voyager/Laravel internals |

### Key Observations

- `clubs` table is minimal: only `id`, `address` (free text), `user_id`. Club name and email come from `users` table (role=2)
- `members.id` is the license number (varchar like "0000001"), not an auto-increment
- `members.name` is a single uppercase string (e.g., "JOSE MANUEL CARCELES LASO")
- `members.rank` has typos: "KIU" (21 records), "KUY" (1 record) instead of "KYU"
- `members.fukushidoin` and `members.shidoin` are boolean flags for instructor category
- Licenses don't exist as a separate table - data is embedded in members
- Insurances don't exist as a separate table - only boolean flags in members
- 342 out of 1,105 members have a linked user account
- User passwords are Laravel bcrypt format (`$2y$`)
- Roles: 1=admin, 2=club, 3=member

## Destination System (MongoDB)

### Collections

- `clubs` - Full address structure (address, city, province, postal_code, country)
- `members` - Separate first_name/last_name, club_role, status
- `licenses` - Separate collection with license_number, grade, categories
- `users` - global_role (super_admin/user), member_id link
- `seminars` - Full event structure with instructor, venue, dates

## Migration Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Strategy | Big Bang | Small dataset (~1,300 records), clean target, seconds to execute |
| Passwords | Migrate hashes (`$2y$` → `$2b$`) | Users keep current passwords, Python bcrypt compatible |
| Name splitting | Smart split with Spanish compound name detection | Better accuracy than naive first-word split |
| Licenses | Auto-generate from member data | member.id → license_number, preserves historical data |
| Payments | Don't migrate | Start fresh in new system |
| Address parsing | Auto-parse with regex | Extract postal_code, city, province from free text |

## Transformation Details

### 1. Clubs (clubs + users → clubs)

```
MariaDB                               →  MongoDB
clubs.id (int)                        →  _id (new ObjectId)
users.name (where role=2)             →  name
users.email                           →  email
clubs.address (free text)             →  address, city, province, postal_code, country (parsed)
(not available)                       →  phone: ""
(not available)                       →  website: null
(always)                              →  is_active: true
clubs.created_at                      →  created_at (or utcnow() if null)
clubs.updated_at                      →  updated_at
```

Address parsing regex patterns:
- Postal code: `\b\d{5}\b`
- Province: content in parentheses `\(([^)]+)\)`
- City: text between postal code and province
- Address: everything before postal code

### 2. Members (members → members)

```
MariaDB                               →  MongoDB
(new ObjectId)                        →  _id
members.name → smart split            →  first_name, last_name
members.identification_number         →  dni
members.email                         →  email
members.phone                         →  phone
(not available)                       →  address, city, province, postal_code, country: ""
members.birth_date                    →  birth_date
members.club_id → lookup ObjectId     →  club_id
(always)                              →  status: "active"
(derived)                             →  club_role: "admin" if user has role=2, else "member"
members.enrollment_date               →  registration_date
members.created_at                    →  created_at
members.updated_at                    →  updated_at
```

Smart name splitting - compound Spanish first names list:
`JOSE MANUEL`, `MARIA DEL CARMEN`, `JUAN CARLOS`, `MARIA JOSE`, `ANA MARIA`, `JOSE LUIS`, `JOSE ANTONIO`, `MARIA TERESA`, `JUAN ANTONIO`, `FRANCISCO JAVIER`, etc.

Rank normalization: `KIU` → `KYU`, `KUY` → `KYU`

### 3. Licenses (generated from members → licenses)

```
MariaDB                               →  MongoDB
(new ObjectId)                        →  _id
members.id (varchar)                  →  license_number
member migrated ObjectId              →  member_id
(not available)                       →  association_id: null
members.rank (normalized)             →  technical_grade: "dan" | "kyu"
members.rank + level                  →  grade: e.g., "3er Dan", "6 Kyu"
(always)                              →  status: "active"
member.created_at                     →  issue_date
(not available)                       →  expiration_date: null
members.fukushidoin/shidoin           →  instructor_category: "fukushidoin"|"shidoin"|"none"
(derived from birth_date)             →  age_category: "infantil" (<18) | "adulto" (>=18)
members.created_at                    →  created_at
```

### 4. Users (users → users)

```
MariaDB                               →  MongoDB
(new ObjectId)                        →  _id
users.email                           →  email
users.name                            →  username
users.password ($2y$→$2b$)            →  hashed_password
(always)                              →  is_active: true
role=1 → "super_admin"                →  global_role
role=2,3 → "user"                     →  global_role
member ObjectId if linked             →  member_id (nullable)
users.created_at                      →  created_at
users.updated_at                      →  updated_at
```

### 5. Seminars (seminars → seminars)

```
MariaDB                               →  MongoDB
(new ObjectId)                        →  _id
"{master} - {place}"                  →  title
"Contact: {contact}"                  →  description
seminars.master                       →  instructor_name
seminars.place                        →  venue
(not available)                       →  address: ""
(not available)                       →  city, province: ""
seminars.date                         →  start_date, end_date (same day)
(not available)                       →  price: 0.0
seminars.club_id → lookup ObjectId    →  club_id
(derived from date)                   →  status: "completed"
seminars.created_at                   →  created_at
```

## Script Architecture

Single Python script: `backend/scripts/migrate_from_mariadb.py`

```
migrate_from_mariadb.py
├── Config & connections (MariaDB + MongoDB)
├── Utilities
│   ├── parse_spanish_name(full_name) → (first_name, last_name)
│   ├── parse_spanish_address(address_text) → {address, city, province, postal_code, country}
│   ├── normalize_rank(rank) → "KYU" | "DAN"
│   ├── derive_instructor_category(fukushidoin, shidoin) → "none"|"fukushidoin"|"shidoin"
│   └── convert_password_hash(laravel_hash) → python_bcrypt_hash
├── Migration functions (strict order)
│   ├── 1. migrate_clubs() → returns {mariadb_id: ObjectId} mapping
│   ├── 2. migrate_members(club_map) → returns {mariadb_id: ObjectId} mapping
│   ├── 3. migrate_licenses(member_map) → generates licenses from member data
│   ├── 4. migrate_users(member_map) → links users with members
│   └── 5. migrate_seminars(club_map) → maps club_ids
├── Post-migration validation
│   ├── verify_counts() → compare MariaDB vs MongoDB counts
│   ├── verify_relationships() → check referential integrity
│   └── verify_samples() → spot-check random records
└── Execution modes
    ├── --dry-run → simulate without writing to MongoDB
    ├── --validate-only → only run validations
    └── --run → execute real migration
```

### Dependencies

```
# Already available (Poetry)
pymongo        # MongoDB driver

# New dependency (dev only)
mariadb        # MariaDB connector for Python
```

### ID Mapping Strategy

- MariaDB uses integer auto-increment IDs
- MongoDB uses ObjectId
- In-memory dict maintained during migration: `{mariadb_id: ObjectId}`
- Mapping used to resolve foreign keys (club_id, member_id, user_id)

## Execution Plan

### Pre-migration

1. Backup MariaDB: `mysqldump spainaikikai > backup_pre_migration.sql`
2. Backup MongoDB: `mongodump --db spainaikikai`
3. Install dependency: `poetry add --group dev mariadb`
4. Dry-run: `poetry run python scripts/migrate_from_mariadb.py --dry-run`

### Execution

5. Clean MongoDB (script handles this automatically)
6. Run migration: `poetry run python scripts/migrate_from_mariadb.py --run`
7. Review report output

### Post-migration

8. Manual validation: login with admin account, review club/member listings
9. Review ambiguous name splits (logged by script)
10. Functional test: navigate frontend verifying data display

## Rollback

- Script is **idempotent** - can be re-run (cleans collections before insert)
- MongoDB has no prior real data → rollback = run seed_demo_data.py
- MariaDB is **read-only** throughout the entire process

## Validation Checklist

```
[ ] Club count: MariaDB 53 = MongoDB 53
[ ] Member count: MariaDB 1105 = MongoDB 1105
[ ] License count: MongoDB 1105 (generated)
[ ] User count: MariaDB 165 = MongoDB 165
[ ] Seminar count: MariaDB 2 = MongoDB 2
[ ] All member.club_id point to existing clubs
[ ] All license.member_id point to existing members
[ ] 342 users linked to members correctly
[ ] Login works with migrated credentials
[ ] No duplicate license_numbers
[ ] Names split correctly (sample review)
[ ] Addresses parsed correctly (sample review)
```

## Downtime

**Zero downtime** - Migration is offline. New system is not yet in production. MariaDB continues running with the legacy Laravel system. Cutover happens after validation.
