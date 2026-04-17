"""Execute the ActionPlan against MongoDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COLL_CLUBS,
    COLL_INSURANCES,
    COLL_LICENSES,
    COLL_MEMBERS,
    COLL_PAYMENTS,
    DEFAULT_CLUB_FEE_AMOUNT,
    LICENSE_YEAR,
)
from .planner import ActionPlan


async def execute_plan(db: AsyncIOMotorDatabase, plan: ActionPlan) -> dict[str, int]:
    """Apply all actions. Returns counts per collection."""
    counts = {
        "club_inserts": 0,
        "member_updates": 0,
        "member_inserts": 0,
        "license_upserts": 0,
        "insurance_upserts": 0,
        "payment_upserts": 0,
    }

    # 0. Insert new clubs first so dependent members can reference them.
    new_club_id_by_ref: dict[str, str] = {}
    for club_doc in plan.club_inserts:
        ref = club_doc.pop("__ref", None)
        now = datetime.now(timezone.utc)
        insert_doc = {
            **club_doc,
            "created_at": now,
            "updated_at": now,
        }
        result = await db[COLL_CLUBS].insert_one(insert_doc)
        if ref:
            new_club_id_by_ref[ref] = str(result.inserted_id)
        counts["club_inserts"] += 1

    # 1. Resolve inserts first to get member_id for dependent actions.
    new_id_by_num_socio: dict[str, str] = {}
    # Snapshot of freshly inserted members' club_id, keyed by the insert ref.
    # Needed later to group payments per club without re-reading the DB.
    new_club_id_by_member_ref: dict[str, str] = {}
    for doc in plan.member_inserts:
        num_socio = doc.pop("__excel_num_socio", None)
        # Resolve placeholder club_id to the freshly inserted club _id.
        club_ref = doc.get("club_id", "")
        if isinstance(club_ref, str) and club_ref.startswith("__new_club__:"):
            doc["club_id"] = new_club_id_by_ref.get(club_ref, "")
        doc["updated_at"] = datetime.now(timezone.utc)
        result = await db[COLL_MEMBERS].insert_one(doc)
        member_ref = f"__new__:{num_socio}"
        new_id_by_num_socio[member_ref] = str(result.inserted_id)
        club_id_final = doc.get("club_id") or ""
        if club_id_final:
            new_club_id_by_member_ref[member_ref] = club_id_final
        counts["member_inserts"] += 1

    # 2. Member updates.
    # Track updates that change club_id so we can resolve club per member
    # without an extra DB round-trip later.
    updated_club_id_by_member_id: dict[str, str] = {}
    for update in plan.member_updates:
        if not update["fields"]:
            continue
        fields = dict(update["fields"])
        club_ref = fields.get("club_id", "")
        if isinstance(club_ref, str) and club_ref.startswith("__new_club__:"):
            resolved = new_club_id_by_ref.get(club_ref)
            if resolved:
                fields["club_id"] = resolved
            else:
                fields.pop("club_id", None)
        if fields.get("club_id"):
            updated_club_id_by_member_id[update["prod_id"]] = fields["club_id"]
        await db[COLL_MEMBERS].update_one(
            {"_id": ObjectId(update["prod_id"])},
            {"$set": {**fields, "updated_at": datetime.now(timezone.utc)}},
        )
        counts["member_updates"] += 1

    # 3. Licenses.
    next_license_num = await _next_license_number(db)
    for lic in plan.license_upserts:
        member_id = _resolve_member_id(lic["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        set_fields = {k: v for k, v in lic.items() if k != "member_id"}
        set_fields["member_id"] = member_id
        set_fields["updated_at"] = datetime.now(timezone.utc)
        set_on_insert = {
            "created_at": datetime.now(timezone.utc),
            "license_number": str(next_license_num).zfill(7),
        }
        next_license_num += 1
        await db[COLL_LICENSES].update_one(
            {"member_id": member_id},
            {"$set": set_fields, "$setOnInsert": set_on_insert},
            upsert=True,
        )
        counts["license_upserts"] += 1

    # 4. Insurances.
    for ins in plan.insurance_upserts:
        member_id = _resolve_member_id(ins["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        key = {
            "member_id": member_id,
            "insurance_type": ins["insurance_type"],
            "start_date": ins["start_date"],
        }
        await db[COLL_INSURANCES].update_one(
            key,
            {
                "$set": {**ins, "member_id": member_id,
                         "updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["insurance_upserts"] += 1

    # 5. Member payments — link each payment to a per-club synthetic transaction.
    #    The dashboard counts "clubs al día" via distinct transactions.club_id,
    #    so creating one synthetic tx per club ensures every club with Excel
    #    payments shows up. Orphan payments (member without club) fall back to
    #    the global EXCEL_IMPORT_{year} transaction.
    global_tx_id = await _ensure_synthetic_transaction(db, LICENSE_YEAR)

    # Resolve each payment to (final_member_id, club_id, amount) so we can
    # aggregate per club before touching member_payments.
    resolved_payments: list[tuple[dict[str, Any], str, str | None]] = []
    amount_by_club: dict[str, float] = {}
    missing_club_member_ids: set[str] = set()
    for pay in plan.payment_upserts:
        member_id = _resolve_member_id(pay["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        club_id = await _resolve_member_club_id(
            db,
            member_id,
            new_club_id_by_member_ref,
            updated_club_id_by_member_id,
            pay["member_id"],
        )
        resolved_payments.append((pay, member_id, club_id))
        if club_id:
            amount_by_club[club_id] = amount_by_club.get(club_id, 0) + float(
                pay.get("amount", 0) or 0
            )
        else:
            missing_club_member_ids.add(member_id)

    # Upsert one synthetic transaction per club with aggregated amount
    # (member payments + cuota_club so the tx total matches reality).
    club_tx_id_by_club_id: dict[str, str] = {}
    if amount_by_club:
        club_name_by_id = await _club_name_map(db, list(amount_by_club.keys()))
        for club_id, total in amount_by_club.items():
            tx_id = await _ensure_club_transaction(
                db,
                year=LICENSE_YEAR,
                club_id=club_id,
                amount=total + DEFAULT_CLUB_FEE_AMOUNT,
                club_name=club_name_by_id.get(club_id),
            )
            club_tx_id_by_club_id[club_id] = tx_id

    # Emit one cuota_club payment per club (anchored on any active member).
    anchor_member_by_club: dict[str, str] = {}
    for _pay, member_id, club_id in resolved_payments:
        if club_id and club_id not in anchor_member_by_club:
            anchor_member_by_club[club_id] = member_id

    for pay, member_id, club_id in resolved_payments:
        key = {
            "member_id": member_id,
            "payment_year": pay["payment_year"],
            "payment_type": pay["payment_type"],
        }
        payment_tx_id = (
            club_tx_id_by_club_id.get(club_id) if club_id else global_tx_id
        )
        await db[COLL_PAYMENTS].update_one(
            key,
            {
                "$set": {
                    **pay,
                    "member_id": member_id,
                    "payment_id": payment_tx_id,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["payment_upserts"] += 1

    # cuota_club: one per club, anchored on any active member.
    for club_id, anchor_member_id in anchor_member_by_club.items():
        tx_id = club_tx_id_by_club_id.get(club_id)
        if not tx_id:
            continue
        await db[COLL_PAYMENTS].update_one(
            {
                "member_id": anchor_member_id,
                "payment_year": LICENSE_YEAR,
                "payment_type": "cuota_club",
            },
            {
                "$set": {
                    "payment_id": tx_id,
                    "member_id": anchor_member_id,
                    "payment_year": LICENSE_YEAR,
                    "payment_type": "cuota_club",
                    "concept": f"cuota_club - {LICENSE_YEAR}",
                    "amount": DEFAULT_CLUB_FEE_AMOUNT,
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["payment_upserts"] += 1

    return counts


def _resolve_member_id(
    ref: str, new_id_by_num_socio: dict[str, str]
) -> str | None:
    if ref.startswith("__new__:"):
        return new_id_by_num_socio.get(ref)
    return ref


async def _resolve_member_club_id(
    db: AsyncIOMotorDatabase,
    member_id: str,
    new_club_id_by_member_ref: dict[str, str],
    updated_club_id_by_member_id: dict[str, str],
    original_ref: str,
) -> str | None:
    """Find the club_id for a member, preferring in-memory snapshots."""
    if original_ref.startswith("__new__:"):
        club_id = new_club_id_by_member_ref.get(original_ref)
        if club_id:
            return club_id
    if member_id in updated_club_id_by_member_id:
        return updated_club_id_by_member_id[member_id]
    try:
        doc = await db[COLL_MEMBERS].find_one(
            {"_id": ObjectId(member_id)}, {"club_id": 1}
        )
    except Exception:
        return None
    if not doc:
        return None
    club_id = doc.get("club_id")
    return club_id or None


async def _club_name_map(
    db: AsyncIOMotorDatabase, club_ids: list[str]
) -> dict[str, str]:
    """Return a {club_id: name} map for the provided club _ids (as strings)."""
    object_ids: list[ObjectId] = []
    for cid in club_ids:
        try:
            object_ids.append(ObjectId(cid))
        except Exception:
            continue
    if not object_ids:
        return {}
    cursor = db[COLL_CLUBS].find(
        {"_id": {"$in": object_ids}}, {"name": 1}
    )
    out: dict[str, str] = {}
    async for doc in cursor:
        out[str(doc["_id"])] = doc.get("name") or ""
    return out


async def _ensure_synthetic_transaction(db: AsyncIOMotorDatabase, year: int) -> str:
    """Ensure a synthetic transaction exists for Excel-imported payments and return its _id string."""
    tx_marker = f"EXCEL_IMPORT_{year}"
    existing = await db["transactions"].find_one({"transaction_id": tx_marker})
    if existing:
        return str(existing["_id"])
    now = datetime.now(timezone.utc)
    doc = {
        "member_id": None,
        "club_id": None,
        "payment_type": "annual_quota",
        "amount": 0,
        "status": "completed",
        "payment_date": now,
        "transaction_id": tx_marker,
        "redsys_response": None,
        "error_message": None,
        "refund_amount": None,
        "refund_date": None,
        "related_entity_id": None,
        "payment_year": year,
        "payer_name": f"ASA Excel Import {year - 1}-{year}",
        "line_items_data": None,
        "member_assignments": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db["transactions"].insert_one(doc)
    return str(result.inserted_id)


async def _ensure_club_transaction(
    db: AsyncIOMotorDatabase,
    year: int,
    club_id: str,
    amount: float,
    club_name: str | None,
) -> str:
    """Upsert a synthetic per-club transaction and return its _id string.

    Idempotent on re-run: keyed by transaction_id == EXCEL_IMPORT_{year}_{club_id}.
    """
    tx_marker = f"EXCEL_IMPORT_{year}_{club_id}"
    now = datetime.now(timezone.utc)
    payer = club_name or "ASA Excel Import"
    set_fields = {
        "member_id": None,
        "club_id": club_id,
        "payment_type": "annual_quota",
        "amount": amount,
        "status": "completed",
        "payment_date": now,
        "transaction_id": tx_marker,
        "redsys_response": None,
        "error_message": None,
        "refund_amount": None,
        "refund_date": None,
        "related_entity_id": None,
        "payment_year": year,
        "payer_name": payer,
        "line_items_data": None,
        "member_assignments": None,
        "updated_at": now,
    }
    result = await db["transactions"].find_one_and_update(
        {"transaction_id": tx_marker},
        {"$set": set_fields, "$setOnInsert": {"created_at": now}},
        upsert=True,
        return_document=True,
        projection={"_id": 1},
    )
    if result is None:
        # Fallback: find it after upsert (shouldn't happen with return_document=True).
        result = await db["transactions"].find_one(
            {"transaction_id": tx_marker}, {"_id": 1}
        )
    return str(result["_id"])


async def _next_license_number(db: AsyncIOMotorDatabase) -> int:
    """Return max existing numeric license_number + 1."""
    cursor = db[COLL_LICENSES].aggregate([
        {"$match": {"license_number": {"$regex": "^[0-9]+$"}}},
        {"$project": {"num": {"$toInt": "$license_number"}}},
        {"$group": {"_id": None, "max": {"$max": "$num"}}},
    ])
    result = await cursor.to_list(length=1)
    return (result[0]["max"] if result else 0) + 1
