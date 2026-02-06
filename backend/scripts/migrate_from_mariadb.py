#!/usr/bin/env python3
"""
Migration script: MariaDB (legacy Laravel/Voyager) → MongoDB (new FastAPI system).

Migrates clubs, members, licenses, users, and seminars.
MariaDB is read-only throughout. MongoDB collections are cleaned before insert.

Usage:
    poetry run python scripts/migrate_from_mariadb.py --dry-run
    poetry run python scripts/migrate_from_mariadb.py --run
    poetry run python scripts/migrate_from_mariadb.py --validate-only
"""

import argparse
import asyncio
import logging
import os
import random
import re
import sys
from datetime import datetime, date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv()

import pymysql
import motor.motor_asyncio
from bson import ObjectId

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("migration")

# ---------------------------------------------------------------------------
# Connection config
# ---------------------------------------------------------------------------
MARIADB_CONFIG = {
    "host": os.getenv("MARIADB_HOST", "localhost"),
    "port": int(os.getenv("MARIADB_PORT", "3306")),
    "user": os.getenv("MARIADB_USER", "spainaikikai"),
    "password": os.getenv("MARIADB_PASSWORD", "SpainAikikai"),
    "database": os.getenv("MARIADB_DATABASE", "spainaikikai"),
}

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spainaikikai")

COLLECTIONS_TO_CLEAN = ["clubs", "members", "licenses", "users", "seminars"]

# ---------------------------------------------------------------------------
# Spanish compound first names (for smart name splitting)
# ---------------------------------------------------------------------------
COMPOUND_NAMES = [
    "JOSE MANUEL", "MARIA DEL CARMEN", "JUAN CARLOS", "MARIA JOSE",
    "ANA MARIA", "JOSE LUIS", "JOSE ANTONIO", "MARIA TERESA",
    "JUAN ANTONIO", "FRANCISCO JAVIER", "MARIA ANGELES", "MARIA DOLORES",
    "MARIA PILAR", "JUAN JOSE", "PEDRO JOSE", "ROSA MARIA",
    "MARIA LUISA", "MARIA ISABEL", "JOSE CARLOS", "MARIA VICTORIA",
    "JOSE MARIA", "MIGUEL ANGEL", "MARIA ELENA", "JOSE FRANCISCO",
    "MARIA ROSA", "LUIS MIGUEL", "JOSE IGNACIO", "MARIA MERCEDES",
    "JUAN MANUEL", "CARLOS ALBERTO", "JOSE MIGUEL", "ANA BELEN",
    "MARIA DEL PILAR", "MARIA DE LOS ANGELES", "MARIA DEL ROSARIO",
]

# Sort longest first so "MARIA DEL CARMEN" matches before "MARIA"
COMPOUND_NAMES.sort(key=len, reverse=True)


# ===========================================================================
# Utility functions
# ===========================================================================

def parse_spanish_name(full_name: str) -> tuple[str, str]:
    """Split a single uppercase name into (first_name, last_name) using
    Spanish compound name detection. Returns title-cased strings."""
    if not full_name or not full_name.strip():
        return ("", "")

    normalized = " ".join(full_name.upper().split())  # collapse whitespace

    for compound in COMPOUND_NAMES:
        if normalized.startswith(compound + " "):
            rest = normalized[len(compound):].strip()
            if rest:
                return (compound.title(), rest.title())

    parts = normalized.split()
    if len(parts) == 1:
        log.warning("Single-word name (no last name): '%s'", full_name)
        return (parts[0].title(), "")
    elif len(parts) == 2:
        return (parts[0].title(), parts[1].title())
    else:
        # Default: first word = first_name, rest = last_name
        return (parts[0].title(), " ".join(parts[1:]).title())


def parse_spanish_address(address_text: str | None) -> dict:
    """Parse a free-text Spanish address into structured fields."""
    result = {
        "address": "",
        "city": "",
        "province": "",
        "postal_code": "",
        "country": "Spain",
    }
    if not address_text or not address_text.strip():
        return result

    text = " ".join(address_text.strip().split())  # normalize whitespace

    # Extract postal code (5 digits, optionally preceded by "C.P." or "CP")
    cp_match = re.search(r'(?:C\.?P\.?\s*)?(\d{5})', text)
    postal_code = cp_match.group(1) if cp_match else ""

    # Extract province (content in parentheses)
    prov_match = re.search(r'\(([^)]+)\)', text)
    province = prov_match.group(1).strip() if prov_match else ""

    if postal_code:
        # Address = everything before the postal code pattern
        cp_full_match = re.search(r'(?:C\.?P\.?\s*)?\d{5}', text)
        address_part = text[:cp_full_match.start()].strip().rstrip(',').strip()

        # City = text between postal code and province (or end)
        after_cp = text[cp_full_match.end():].strip()
        if prov_match:
            # City is between postal code and opening parenthesis
            paren_pos = text.find('(', cp_full_match.end())
            if paren_pos > cp_full_match.end():
                city = text[cp_full_match.end():paren_pos].strip().rstrip(',').strip()
            else:
                city = ""
        else:
            city = after_cp.strip().rstrip(',').strip()

        result["address"] = address_part
        result["city"] = city
        result["province"] = province
        result["postal_code"] = postal_code
    else:
        # No postal code found - try to extract province from parens still
        if province:
            paren_start = text.find('(')
            result["address"] = text[:paren_start].strip().rstrip(',').strip() if paren_start > 0 else text
            result["province"] = province
        else:
            result["address"] = text

    return result


def normalize_rank(rank: str | None) -> str | None:
    """Normalize rank typos: KIU/KUY → KYU."""
    if rank is None:
        return None
    upper = rank.upper().strip()
    if upper in ("KIU", "KUY"):
        return "KYU"
    return upper if upper else None


def derive_instructor_category(fukushidoin, shidoin) -> str:
    """Determine instructor category from boolean flags."""
    if shidoin and int(shidoin) >= 1:
        return "shidoin"
    if fukushidoin and int(fukushidoin) >= 1:
        return "fukushidoin"
    return "none"


def convert_password_hash(laravel_hash: str) -> str:
    """Convert Laravel bcrypt ($2y$) to Python bcrypt ($2b$)."""
    if laravel_hash and laravel_hash.startswith("$2y$"):
        return "$2b$" + laravel_hash[4:]
    return laravel_hash


def format_grade(rank: str, level: str) -> str:
    """Format rank + level into a display string like '3er Dan' or '6 Kyu'."""
    try:
        lvl = int(level)
    except (ValueError, TypeError):
        return f"{level} {rank.title()}"

    rank_upper = rank.upper()
    if rank_upper == "DAN":
        if lvl == 1:
            return "1er Dan"
        elif lvl == 2:
            return f"2\u00ba Dan"
        elif lvl == 3:
            return "3er Dan"
        else:
            return f"{lvl}\u00ba Dan"
    else:  # KYU
        return f"{lvl}\u00ba Kyu"


def clean_phone(phone) -> str:
    """Clean phone value, handling None and literal 'null' strings."""
    if phone is None or str(phone).strip().lower() == "null":
        return ""
    return str(phone).strip()


def to_naive_datetime(val) -> datetime | None:
    """Convert a date/datetime to a naive datetime for MongoDB storage."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=None)
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day)
    return None


# ===========================================================================
# Migration functions
# ===========================================================================

def mariadb_query(conn, sql: str) -> list[dict]:
    """Execute a read-only query and return rows as dicts."""
    with conn.cursor(pymysql.cursors.DictCursor) as cursor:
        cursor.execute(sql)
        return cursor.fetchall()


async def clean_mongodb(db, dry_run: bool):
    """Remove all documents from target collections."""
    for coll_name in COLLECTIONS_TO_CLEAN:
        if dry_run:
            count = await db[coll_name].count_documents({})
            log.info("  [DRY-RUN] Would delete %d documents from '%s'", count, coll_name)
        else:
            result = await db[coll_name].delete_many({})
            log.info("  Deleted %d documents from '%s'", result.deleted_count, coll_name)


async def migrate_clubs(conn, db, dry_run: bool) -> dict:
    """Migrate clubs (joined with users for name/email). Returns {mariadb_id: ObjectId_str}."""
    sql = """
        SELECT c.id, c.address, CAST(c.user_id AS CHAR) as user_id,
               c.created_at, c.updated_at,
               u.name, u.email
        FROM clubs c
        JOIN users u ON c.user_id = u.id
    """
    rows = mariadb_query(conn, sql)
    club_map = {}
    docs = []

    for row in rows:
        oid = ObjectId()
        parsed_addr = parse_spanish_address(row.get("address"))

        doc = {
            "_id": oid,
            "name": (row["name"] or "").strip().title(),
            "email": (row["email"] or "").strip().lower(),
            "phone": "",
            "website": None,
            "address": parsed_addr["address"],
            "city": parsed_addr["city"],
            "province": parsed_addr["province"],
            "postal_code": parsed_addr["postal_code"],
            "country": parsed_addr["country"],
            "is_active": True,
            "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
            "updated_at": to_naive_datetime(row.get("updated_at")) or datetime.utcnow(),
        }
        docs.append(doc)
        club_map[row["id"]] = str(oid)

    if dry_run:
        log.info("  [DRY-RUN] Would insert %d clubs", len(docs))
        for d in docs[:3]:
            log.info("    Sample: %s (%s)", d["name"], d["email"])
    else:
        if docs:
            await db.clubs.insert_many(docs)
        log.info("  Inserted %d clubs", len(docs))

    return club_map


async def migrate_members(conn, db, club_map: dict, dry_run: bool) -> dict:
    """Migrate members. Returns {mariadb_member_id: ObjectId_str}."""
    # Get all members
    sql = """
        SELECT id, name, club_id, level, rank, fukushidoin, shidoin,
               phone, birth_date, identification_number, email,
               CAST(user_id AS CHAR) as user_id,
               enrollment_date, created_at, updated_at
        FROM members
    """
    rows = mariadb_query(conn, sql)

    # Determine which members are club admins (user role_id = 2)
    admin_sql = """
        SELECT m.id as member_id
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE u.role_id = 2
    """
    admin_rows = mariadb_query(conn, admin_sql)
    admin_member_ids = {r["member_id"] for r in admin_rows}

    member_map = {}
    docs = []
    unmapped_clubs = set()

    for row in rows:
        oid = ObjectId()
        first_name, last_name = parse_spanish_name(row["name"] or "")

        # Map club_id
        mariadb_club_id = row["club_id"]
        mongo_club_id = club_map.get(mariadb_club_id)
        if not mongo_club_id:
            unmapped_clubs.add(mariadb_club_id)

        club_role = "admin" if row["id"] in admin_member_ids else "member"

        doc = {
            "_id": oid,
            "first_name": first_name,
            "last_name": last_name,
            "dni": (row.get("identification_number") or "").strip(),
            "email": (row.get("email") or "").strip().lower() if row.get("email") else "",
            "phone": clean_phone(row.get("phone")),
            "address": "",
            "city": "",
            "province": "",
            "postal_code": "",
            "country": "Spain",
            "birth_date": to_naive_datetime(row.get("birth_date")),
            "club_id": mongo_club_id,
            "status": "active",
            "club_role": club_role,
            "registration_date": to_naive_datetime(row.get("enrollment_date")),
            "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
            "updated_at": to_naive_datetime(row.get("updated_at")) or datetime.utcnow(),
        }
        docs.append(doc)
        member_map[row["id"]] = str(oid)

    if unmapped_clubs:
        log.warning("  %d members reference unmapped club_ids: %s",
                     len(unmapped_clubs), unmapped_clubs)

    if dry_run:
        log.info("  [DRY-RUN] Would insert %d members (%d admins)",
                 len(docs), len(admin_member_ids))
        for d in docs[:3]:
            log.info("    Sample: %s %s (club_role=%s)",
                     d["first_name"], d["last_name"], d["club_role"])
    else:
        if docs:
            await db.members.insert_many(docs)
        log.info("  Inserted %d members (%d admins)", len(docs), len(admin_member_ids))

    return member_map


async def migrate_licenses(conn, db, member_map: dict, dry_run: bool) -> int:
    """Generate licenses from member data. Returns count inserted."""
    sql = """
        SELECT id, rank, level, fukushidoin, shidoin, birth_date, created_at
        FROM members
        WHERE rank IS NOT NULL AND rank != ''
    """
    rows = mariadb_query(conn, sql)
    docs = []

    for row in rows:
        mongo_member_id = member_map.get(row["id"])
        if not mongo_member_id:
            log.warning("  License: member '%s' not in member_map, skipping", row["id"])
            continue

        rank_normalized = normalize_rank(row["rank"])
        if not rank_normalized:
            continue

        technical_grade = rank_normalized.lower()  # "dan" or "kyu"
        grade = format_grade(rank_normalized, row.get("level") or "1")
        instructor_cat = derive_instructor_category(row.get("fukushidoin"), row.get("shidoin"))

        # Determine age category from birth_date
        age_category = "adulto"
        if row.get("birth_date"):
            bd = row["birth_date"]
            if isinstance(bd, (date, datetime)):
                today = date.today()
                bd_date = bd.date() if isinstance(bd, datetime) else bd
                age = today.year - bd_date.year - (
                    (today.month, today.day) < (bd_date.month, bd_date.day)
                )
                if age < 18:
                    age_category = "infantil"

        doc = {
            "_id": ObjectId(),
            "license_number": str(row["id"]),
            "member_id": mongo_member_id,
            "association_id": None,
            "license_type": technical_grade,
            "grade": grade,
            "status": "active",
            "issue_date": to_naive_datetime(row.get("created_at")),
            "expiration_date": None,
            "renewal_date": None,
            "is_renewed": False,
            "technical_grade": technical_grade,
            "instructor_category": instructor_cat,
            "age_category": age_category,
            "last_payment_id": None,
            "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        docs.append(doc)

    if dry_run:
        log.info("  [DRY-RUN] Would insert %d licenses", len(docs))
        for d in docs[:3]:
            log.info("    Sample: license_number=%s, grade=%s, instructor=%s",
                     d["license_number"], d["grade"], d["instructor_category"])
    else:
        if docs:
            await db.licenses.insert_many(docs)
        log.info("  Inserted %d licenses", len(docs))

    return len(docs)


async def migrate_users(conn, db, member_map: dict, club_map: dict, dry_run: bool) -> dict:
    """Migrate users, linking to members. Returns {mariadb_user_id: ObjectId_str}.

    For role_id=2 (club) users, the new system requires user.member_id to determine
    which club the user belongs to (AuthContext reads member_id → member → club_id).
    - If the club user has linked members, pick the first one as member_id.
    - If no linked members exist, create a synthetic admin member for their club.
    """
    sql = """
        SELECT CAST(id AS CHAR) as id, name, email, password,
               CAST(role_id AS CHAR) as role_id,
               created_at, updated_at
        FROM users
    """
    rows = mariadb_query(conn, sql)

    # Build reverse map: mariadb_user_id → list of mariadb_member_ids
    member_user_sql = """
        SELECT id as member_id, CAST(user_id AS CHAR) as user_id
        FROM members
        WHERE user_id IS NOT NULL
    """
    member_user_rows = mariadb_query(conn, member_user_sql)
    user_to_members = {}
    for r in member_user_rows:
        uid = str(r["user_id"])
        mid = r["member_id"]
        user_to_members.setdefault(uid, []).append(mid)

    # Build map: mariadb_user_id → mariadb_club_id (for role_id=2 users)
    club_user_sql = """
        SELECT CAST(u.id AS CHAR) as user_id, c.id as club_id
        FROM users u
        JOIN clubs c ON c.user_id = u.id
        WHERE u.role_id = 2
    """
    club_user_rows = mariadb_query(conn, club_user_sql)
    user_to_club = {str(r["user_id"]): r["club_id"] for r in club_user_rows}

    user_map = {}
    docs = []
    synthetic_members = []  # members to create for club users without linked members

    for row in rows:
        oid = ObjectId()
        user_id_str = str(row["id"])
        role_id = str(row.get("role_id") or "")

        global_role = "super_admin" if role_id == "1" else "user"

        # Find linked member_id
        linked_member_id = None
        mariadb_member_ids = user_to_members.get(user_id_str, [])

        if role_id == "3" and mariadb_member_ids:
            # role=3 users are individual members - pick the first linked member
            for mid in mariadb_member_ids:
                if mid in member_map:
                    linked_member_id = member_map[mid]
                    break

        elif role_id == "2":
            # role=2 users are club accounts - need member_id for AuthContext
            # First try: pick an existing linked member
            for mid in mariadb_member_ids:
                if mid in member_map:
                    linked_member_id = member_map[mid]
                    break

            # Second: if no linked member, create a synthetic admin member
            if not linked_member_id:
                mariadb_club_id = user_to_club.get(user_id_str)
                mongo_club_id = club_map.get(mariadb_club_id) if mariadb_club_id else None
                if mongo_club_id:
                    synth_oid = ObjectId()
                    club_name = (row["name"] or "").strip()
                    synth_member = {
                        "_id": synth_oid,
                        "first_name": club_name.title() if club_name else "Admin",
                        "last_name": "(Club Admin)",
                        "dni": "",
                        "email": (row["email"] or "").strip().lower(),
                        "phone": "",
                        "address": "",
                        "city": "",
                        "province": "",
                        "postal_code": "",
                        "country": "Spain",
                        "birth_date": None,
                        "club_id": mongo_club_id,
                        "status": "active",
                        "club_role": "admin",
                        "registration_date": None,
                        "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
                        "updated_at": to_naive_datetime(row.get("updated_at")) or datetime.utcnow(),
                    }
                    synthetic_members.append(synth_member)
                    linked_member_id = str(synth_oid)
                    log.info("    Created synthetic admin member for club user: %s (%s)",
                             row["email"], club_name)
                else:
                    log.warning("    Club user %s has no mapped club, cannot create member",
                                row["email"])

        doc = {
            "_id": oid,
            "email": (row["email"] or "").strip().lower(),
            "username": (row["name"] or "").strip(),
            "hashed_password": convert_password_hash(row["password"] or ""),
            "is_active": True,
            "global_role": global_role,
            "member_id": linked_member_id,
            "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
            "updated_at": to_naive_datetime(row.get("updated_at")) or datetime.utcnow(),
        }
        docs.append(doc)
        user_map[user_id_str] = str(oid)

    # Insert synthetic members first
    if synthetic_members:
        if dry_run:
            log.info("  [DRY-RUN] Would insert %d synthetic admin members", len(synthetic_members))
        else:
            await db.members.insert_many(synthetic_members)
            log.info("  Inserted %d synthetic admin members for club users", len(synthetic_members))

    if dry_run:
        admins = sum(1 for d in docs if d["global_role"] == "super_admin")
        linked = sum(1 for d in docs if d["member_id"] is not None)
        log.info("  [DRY-RUN] Would insert %d users (%d super_admin, %d linked to members)",
                 len(docs), admins, linked)
        for d in docs[:3]:
            log.info("    Sample: %s (%s) role=%s member_id=%s",
                     d["email"], d["username"], d["global_role"], d["member_id"])
    else:
        if docs:
            await db.users.insert_many(docs)
        admins = sum(1 for d in docs if d["global_role"] == "super_admin")
        linked = sum(1 for d in docs if d["member_id"] is not None)
        log.info("  Inserted %d users (%d super_admin, %d linked to members)",
                 len(docs), admins, linked)

    return user_map


async def migrate_seminars(conn, db, club_map: dict, dry_run: bool) -> int:
    """Migrate seminars. Returns count inserted."""
    sql = "SELECT * FROM seminars"
    rows = mariadb_query(conn, sql)
    docs = []

    for row in rows:
        mongo_club_id = club_map.get(row["club_id"])

        title = f"{row['master']} - {row['place']}"
        description = f"Contacto: {row['contact']}" if row.get("contact") else ""

        seminar_date = to_naive_datetime(row.get("date"))

        doc = {
            "_id": ObjectId(),
            "title": title,
            "description": description,
            "instructor_name": row.get("master") or "",
            "venue": row.get("place") or "",
            "address": "",
            "city": "",
            "province": "",
            "start_date": seminar_date,
            "end_date": seminar_date,
            "price": 0.0,
            "max_participants": None,
            "current_participants": 0,
            "club_id": mongo_club_id,
            "association_id": None,
            "status": "completed",
            "created_at": to_naive_datetime(row.get("created_at")) or datetime.utcnow(),
            "updated_at": to_naive_datetime(row.get("updated_at")) or datetime.utcnow(),
        }
        docs.append(doc)

    if dry_run:
        log.info("  [DRY-RUN] Would insert %d seminars", len(docs))
        for d in docs:
            log.info("    Sample: %s (club_id=%s)", d["title"], d["club_id"])
    else:
        if docs:
            await db.seminars.insert_many(docs)
        log.info("  Inserted %d seminars", len(docs))

    return len(docs)


# ===========================================================================
# Validation suite
# ===========================================================================

async def verify_counts(conn, db):
    """Compare record counts between MariaDB and MongoDB."""
    log.info("\n--- Count Verification ---")
    all_ok = True

    # Clubs, users, seminars: exact match
    exact_checks = [
        ("clubs", "SELECT CAST(COUNT(*) AS UNSIGNED) as c FROM clubs"),
        ("users", "SELECT CAST(COUNT(*) AS UNSIGNED) as c FROM users"),
        ("seminars", "SELECT CAST(COUNT(*) AS UNSIGNED) as c FROM seminars"),
    ]
    for coll_name, sql in exact_checks:
        maria_rows = mariadb_query(conn, sql)
        maria_count = maria_rows[0]["c"]
        mongo_count = await db[coll_name].count_documents({})
        status = "OK" if maria_count == mongo_count else "MISMATCH"
        if status == "MISMATCH":
            all_ok = False
        log.info("  %-12s MariaDB=%d  MongoDB=%d  [%s]", coll_name, maria_count, mongo_count, status)

    # Members: MongoDB may have more due to synthetic admin members for club users
    maria_member_rows = mariadb_query(conn, "SELECT CAST(COUNT(*) AS UNSIGNED) as c FROM members")
    maria_member_count = maria_member_rows[0]["c"]
    mongo_member_count = await db.members.count_documents({})
    synthetic_count = mongo_member_count - maria_member_count
    status = "OK" if mongo_member_count >= maria_member_count else "MISMATCH"
    if mongo_member_count < maria_member_count:
        all_ok = False
    log.info("  %-12s MariaDB=%d  MongoDB=%d (+%d synthetic admin members)  [%s]",
             "members", maria_member_count, mongo_member_count, synthetic_count, status)

    # Licenses: compare with members that have rank
    maria_with_rank = mariadb_query(conn,
        "SELECT CAST(COUNT(*) AS UNSIGNED) as c FROM members WHERE rank IS NOT NULL AND rank != ''")
    maria_rank_count = maria_with_rank[0]["c"]
    mongo_license_count = await db.licenses.count_documents({})
    status = "OK" if maria_rank_count == mongo_license_count else "MISMATCH"
    if status == "MISMATCH":
        all_ok = False
    log.info("  %-12s MariaDB(rank!=NULL)=%d  MongoDB=%d  [%s]",
             "licenses", maria_rank_count, mongo_license_count, status)

    return all_ok


async def verify_relationships(db):
    """Check referential integrity in MongoDB."""
    log.info("\n--- Relationship Verification ---")
    all_ok = True

    # All member.club_id should reference existing clubs
    club_ids = set()
    async for doc in db.clubs.find({}, {"_id": 1}):
        club_ids.add(str(doc["_id"]))

    orphan_members = 0
    async for doc in db.members.find({"club_id": {"$ne": None}}, {"club_id": 1}):
        if doc["club_id"] not in club_ids:
            orphan_members += 1
    status = "OK" if orphan_members == 0 else "ISSUE"
    if orphan_members > 0:
        all_ok = False
    log.info("  member.club_id → clubs: %d orphans [%s]", orphan_members, status)

    # All license.member_id should reference existing members
    member_ids = set()
    async for doc in db.members.find({}, {"_id": 1}):
        member_ids.add(str(doc["_id"]))

    orphan_licenses = 0
    async for doc in db.licenses.find({"member_id": {"$ne": None}}, {"member_id": 1}):
        if doc["member_id"] not in member_ids:
            orphan_licenses += 1
    status = "OK" if orphan_licenses == 0 else "ISSUE"
    if orphan_licenses > 0:
        all_ok = False
    log.info("  license.member_id → members: %d orphans [%s]", orphan_licenses, status)

    # All user.member_id (non-null) should reference existing members
    orphan_users = 0
    async for doc in db.users.find({"member_id": {"$ne": None}}, {"member_id": 1}):
        if doc["member_id"] not in member_ids:
            orphan_users += 1
    status = "OK" if orphan_users == 0 else "ISSUE"
    if orphan_users > 0:
        all_ok = False
    log.info("  user.member_id → members: %d orphans [%s]", orphan_users, status)

    return all_ok


async def verify_samples(conn, db):
    """Spot-check random records for data correctness."""
    log.info("\n--- Sample Verification ---")
    all_ok = True

    # Check 5 random clubs: name + email
    sql = """
        SELECT c.id, u.name, u.email
        FROM clubs c JOIN users u ON c.user_id = u.id
        ORDER BY RAND() LIMIT 5
    """
    maria_clubs = mariadb_query(conn, sql)
    for mc in maria_clubs:
        expected_name = (mc["name"] or "").strip().title()
        expected_email = (mc["email"] or "").strip().lower()
        mongo_club = await db.clubs.find_one({"email": expected_email})
        if mongo_club:
            name_ok = mongo_club["name"] == expected_name
            email_ok = mongo_club["email"] == expected_email
            if not (name_ok and email_ok):
                all_ok = False
            log.info("  Club '%s': name=%s email=%s",
                     expected_name, "OK" if name_ok else "MISMATCH", "OK" if email_ok else "MISMATCH")
        else:
            all_ok = False
            log.warning("  Club '%s' (%s): NOT FOUND in MongoDB", expected_name, expected_email)

    # Check 5 random members: DNI matches
    sql_m = """
        SELECT id, identification_number
        FROM members
        WHERE identification_number IS NOT NULL AND identification_number != ''
        ORDER BY RAND() LIMIT 5
    """
    maria_members = mariadb_query(conn, sql_m)
    for mm in maria_members:
        license_num = str(mm["id"])
        expected_dni = (mm["identification_number"] or "").strip()
        # Find member via license
        license_doc = await db.licenses.find_one({"license_number": license_num})
        if license_doc:
            member_doc = await db.members.find_one({"_id": ObjectId(license_doc["member_id"])})
            if member_doc:
                dni_ok = member_doc["dni"] == expected_dni
                if not dni_ok:
                    all_ok = False
                log.info("  Member license=%s: DNI %s", license_num, "OK" if dni_ok else "MISMATCH")
            else:
                all_ok = False
                log.warning("  Member for license=%s: NOT FOUND", license_num)
        else:
            all_ok = False
            log.warning("  License=%s: NOT FOUND in MongoDB", license_num)

    # Verify password hash format
    user_doc = await db.users.find_one({"global_role": "super_admin"})
    if user_doc and user_doc.get("hashed_password", "").startswith("$2b$"):
        log.info("  Admin password hash format: OK ($2b$)")
    else:
        all_ok = False
        log.warning("  Admin password hash format: ISSUE")

    return all_ok


# ===========================================================================
# Main
# ===========================================================================

async def main():
    parser = argparse.ArgumentParser(
        description="Migrate data from MariaDB (legacy Laravel) to MongoDB (new system)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true",
                       help="Simulate migration without writing to MongoDB")
    group.add_argument("--validate-only", action="store_true",
                       help="Only run validations on existing MongoDB data")
    group.add_argument("--run", action="store_true",
                       help="Execute the real migration")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  MariaDB → MongoDB Migration Script")
    print("=" * 60 + "\n")

    # --- Connect MariaDB ---
    log.info("Connecting to MariaDB: %s@%s:%d/%s",
             MARIADB_CONFIG["user"], MARIADB_CONFIG["host"],
             MARIADB_CONFIG["port"], MARIADB_CONFIG["database"])
    try:
        maria_conn = pymysql.connect(**MARIADB_CONFIG)
    except Exception as e:
        log.error("Failed to connect to MariaDB: %s", e)
        sys.exit(1)
    log.info("MariaDB connected.\n")

    # --- Connect MongoDB ---
    log.info("Connecting to MongoDB: %s (db=%s)", MONGODB_URL, DATABASE_NAME)
    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
    mongo_db = mongo_client[DATABASE_NAME]
    try:
        await mongo_client.admin.command("ping")
    except Exception as e:
        log.error("Failed to connect to MongoDB: %s", e)
        maria_conn.close()
        sys.exit(1)
    log.info("MongoDB connected.\n")

    try:
        if args.validate_only:
            log.info("=== VALIDATION ONLY MODE ===\n")
            c_ok = await verify_counts(maria_conn, mongo_db)
            r_ok = await verify_relationships(mongo_db)
            s_ok = await verify_samples(maria_conn, mongo_db)
            overall = c_ok and r_ok and s_ok
            print("\n" + "=" * 60)
            print(f"  VALIDATION {'PASSED' if overall else 'FAILED'}")
            print("=" * 60 + "\n")
            sys.exit(0 if overall else 1)

        dry_run = args.dry_run
        mode = "DRY-RUN" if dry_run else "LIVE MIGRATION"
        log.info("=== %s MODE ===\n", mode)

        # Step 1: Clean MongoDB
        log.info("Step 1: Cleaning MongoDB collections...")
        await clean_mongodb(mongo_db, dry_run)

        # Step 2: Migrate clubs
        log.info("\nStep 2: Migrating clubs...")
        club_map = await migrate_clubs(maria_conn, mongo_db, dry_run)

        # Step 3: Migrate members
        log.info("\nStep 3: Migrating members...")
        member_map = await migrate_members(maria_conn, mongo_db, club_map, dry_run)

        # Step 4: Migrate licenses
        log.info("\nStep 4: Generating licenses...")
        license_count = await migrate_licenses(maria_conn, mongo_db, member_map, dry_run)

        # Step 5: Migrate users
        log.info("\nStep 5: Migrating users...")
        user_map = await migrate_users(maria_conn, mongo_db, member_map, club_map, dry_run)

        # Step 6: Migrate seminars
        log.info("\nStep 6: Migrating seminars...")
        seminar_count = await migrate_seminars(maria_conn, mongo_db, club_map, dry_run)

        # Step 7: Validation (only for live runs)
        if not dry_run:
            log.info("\nStep 7: Running post-migration validation...")
            c_ok = await verify_counts(maria_conn, mongo_db)
            r_ok = await verify_relationships(mongo_db)
            s_ok = await verify_samples(maria_conn, mongo_db)
            overall = c_ok and r_ok and s_ok
        else:
            overall = True

        # Report
        print("\n" + "=" * 60)
        print(f"  MIGRATION {'COMPLETE' if not dry_run else 'DRY-RUN COMPLETE'}")
        print("=" * 60)
        print(f"\n  Clubs:    {len(club_map)}")
        print(f"  Members:  {len(member_map)}")
        print(f"  Licenses: {license_count}")
        print(f"  Users:    {len(user_map)}")
        print(f"  Seminars: {seminar_count}")
        if not dry_run:
            print(f"\n  Validation: {'PASSED' if overall else 'FAILED'}")
        print("=" * 60 + "\n")

    except Exception as e:
        log.error("Migration failed: %s", e, exc_info=True)
        raise
    finally:
        maria_conn.close()
        mongo_client.close()


if __name__ == "__main__":
    asyncio.run(main())
