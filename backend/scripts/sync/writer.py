"""Execute the ActionPlan against MongoDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COLL_INSURANCES,
    COLL_LICENSES,
    COLL_MEMBERS,
    COLL_PAYMENTS,
    LICENSE_YEAR,
)
from .planner import ActionPlan


async def execute_plan(db: AsyncIOMotorDatabase, plan: ActionPlan) -> dict[str, int]:
    """Apply all actions. Returns counts per collection."""
    counts = {
        "member_updates": 0,
        "member_inserts": 0,
        "license_upserts": 0,
        "insurance_upserts": 0,
        "payment_upserts": 0,
    }

    # 1. Resolve inserts first to get member_id for dependent actions.
    new_id_by_num_socio: dict[str, str] = {}
    for doc in plan.member_inserts:
        num_socio = doc.pop("__excel_num_socio", None)
        doc["updated_at"] = datetime.now(timezone.utc)
        result = await db[COLL_MEMBERS].insert_one(doc)
        new_id_by_num_socio[f"__new__:{num_socio}"] = str(result.inserted_id)
        counts["member_inserts"] += 1

    # 2. Member updates.
    for update in plan.member_updates:
        if not update["fields"]:
            continue
        await db[COLL_MEMBERS].update_one(
            {"_id": ObjectId(update["prod_id"])},
            {"$set": {**update["fields"], "updated_at": datetime.now(timezone.utc)}},
        )
        counts["member_updates"] += 1

    # 3. Licenses.
    for lic in plan.license_upserts:
        member_id = _resolve_member_id(lic["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        await db[COLL_LICENSES].update_one(
            {"member_id": member_id},
            {
                "$set": {
                    **{k: v for k, v in lic.items() if k != "member_id"},
                    "member_id": member_id,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
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

    # 5. Member payments.
    for pay in plan.payment_upserts:
        member_id = _resolve_member_id(pay["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        key = {
            "member_id": member_id,
            "payment_year": pay["payment_year"],
            "payment_type": pay["payment_type"],
        }
        await db[COLL_PAYMENTS].update_one(
            key,
            {
                "$set": {**pay, "member_id": member_id,
                         "updated_at": datetime.now(timezone.utc)},
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
