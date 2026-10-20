#!/usr/bin/env python3
"""Move insurance member payments paid in the app to the year of their season.

An insurance paid from October belongs to the next payment year
(docs/domain/payment-cycles.md). Before that rule, the app stored the form year.

Dry run by default: prints each change. Pass --apply to write.

Run with: poetry run python scripts/migrate_autumn_insurance_year.py [--apply]
"""

import argparse
import asyncio
import os
import sys
from typing import Dict, List, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bson import ObjectId
from dotenv import load_dotenv
import motor.motor_asyncio

from src.domain.entities.insurance import insurance_season_year

INSURANCE_TYPES = {"seguro_accidentes", "seguro_rc"}


def plan_changes(member_payments: List[dict], payments_by_id: Dict[str, dict]) -> List[Tuple]:
    changes = []
    for mp in member_payments:
        payment = payments_by_id.get(mp.get("payment_id"))
        if mp.get("payment_type") not in INSURANCE_TYPES or not payment:
            continue
        paid_at = payment.get("payment_date") or payment.get("created_at")
        season_year = insurance_season_year(paid_at)
        if mp["payment_year"] != season_year:
            changes.append((mp["_id"], mp["payment_year"], season_year))
    return changes


async def main(apply: bool) -> None:
    load_dotenv()
    db = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URL"])[os.environ["DATABASE_NAME"]]
    member_payments = await db.member_payments.find(
        {"status": "completed", "payment_type": {"$in": list(INSURANCE_TYPES)}}
    ).to_list(None)
    payment_ids = {mp["payment_id"] for mp in member_payments if ObjectId.is_valid(mp.get("payment_id") or "")}
    payments = await db.transactions.find(
        {"_id": {"$in": [ObjectId(pid) for pid in payment_ids]}}, {"payment_date": 1, "created_at": 1}
    ).to_list(None)
    changes = plan_changes(member_payments, {str(p["_id"]): p for p in payments})

    for mp_id, old_year, new_year in changes:
        print(f"{mp_id}: {old_year} -> {new_year}")
    print(f"{len(changes)} change(s){'' if apply else ' (dry run, nothing written)'}")

    if apply:
        for mp_id, _, new_year in changes:
            await db.member_payments.update_one({"_id": mp_id}, {"$set": {"payment_year": new_year}})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the changes")
    asyncio.run(main(parser.parse_args().apply))
