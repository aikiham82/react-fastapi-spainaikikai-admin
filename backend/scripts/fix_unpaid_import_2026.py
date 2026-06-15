"""Remove bogus 2026 'paid' records created by the Excel import for clubs that
never actually submitted/paid (no 'Fecha de envío' in the Excel).

Root cause: scripts/sync (planner.py) creates status=completed member_payments for
EVERY roster member, regardless of whether the club paid. The Excel's real payment
signal is the 'Fecha de envío' column, present for only 4 clubs. All other clubs
(incl. Muzen Dojo) were wrongly marked as paid.

This script deletes ONLY import-created payments — those whose `payment_id` equals an
`EXCEL_IMPORT_2026_<club_id>` transaction id — for the non-submitted clubs, plus those
import transaction records. Real payments made later through the app have a different
`payment_id` and are preserved.

Usage:
    poetry run python scripts/fix_unpaid_import_2026.py --env-file .env.production
    poetry run python scripts/fix_unpaid_import_2026.py --env-file .env.production --execute

Idempotent: re-running after --execute finds nothing to delete.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Clubs that DID submit/pay (all members have 'Fecha de envío' in the Excel).
# Confirmed with the secretary: Hanami, Aikimadrid, Heijoshin, Musubi Azuqueca.
PAID_CLUB_IDS = {
    "69e1e9ebba9a2a00aa2d77e5",  # Aikido Hanami
    "6985f6004dca105b754e6c70",  # Aikimadrid
    "6985f6004dca105b754e6c72",  # Dojo Heijoshin
    "6985f6004dca105b754e6c77",  # Musubi Aikido Azuqueca
}

TX_PREFIX = "EXCEL_IMPORT_2026_"
YEAR = 2026


async def main_async(args: argparse.Namespace) -> int:
    load_dotenv(args.env_file, override=True)
    mongo_uri = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    if not mongo_uri or not db_name:
        print("ERROR: MONGODB_URL or DATABASE_NAME not set", file=sys.stderr)
        return 2

    host = mongo_uri[: mongo_uri.find("@")] if "@" in mongo_uri else mongo_uri[:20]
    print(f"Target DB: {db_name} @ {host}...")
    print(f"Mode: {'EXECUTE (will delete)' if args.execute else 'DRY-RUN (no changes)'}\n")

    client = AsyncIOMotorClient(mongo_uri)
    try:
        db = client[db_name]

        # 1. Find per-club import transactions; split paid vs non-submitted.
        txs = await db.transactions.find(
            {"transaction_id": {"$regex": f"^{TX_PREFIX}"}}
        ).to_list(length=None)

        non_submitted = []  # (club_id, tx_id_str, payer_name)
        for tx in txs:
            tid = tx["transaction_id"]
            club_id = tid[len(TX_PREFIX):]
            if not club_id:
                continue  # the global EXCEL_IMPORT_2026 marker
            if club_id in PAID_CLUB_IDS:
                continue
            non_submitted.append((club_id, str(tx["_id"]), tx.get("payer_name", "?")))

        if not non_submitted:
            print("Nothing to remediate (no non-submitted import transactions found).")
            return 0

        non_submitted_tx_ids = [t[1] for t in non_submitted]

        # 2. Report bogus payments per club (payment_id == that club's import tx id).
        print(f"Non-submitted clubs flagged: {len(non_submitted)}")
        print("-" * 72)
        total_pay = 0
        total_amt = 0.0
        preserved_total = 0
        for club_id, tx_id, payer in sorted(non_submitted, key=lambda x: x[2]):
            bogus = await db.member_payments.count_documents({"payment_id": tx_id})
            bogus_amt_doc = await db.member_payments.aggregate([
                {"$match": {"payment_id": tx_id}},
                {"$group": {"_id": None, "amt": {"$sum": "$amount"}}},
            ]).to_list(length=1)
            amt = bogus_amt_doc[0]["amt"] if bogus_amt_doc else 0.0

            # Preserve check: real payments for this club's members NOT from the import.
            members = await db.members.find(
                {"club_id": club_id}, {"_id": 1}
            ).to_list(length=None)
            mids = [str(m["_id"]) for m in members]
            preserved = await db.member_payments.count_documents({
                "member_id": {"$in": mids},
                "payment_year": YEAR,
                "payment_id": {"$nin": non_submitted_tx_ids},
            })
            preserved_total += preserved
            total_pay += bogus
            total_amt += amt
            extra = f"  | PRESERVE {preserved} real app payment(s)" if preserved else ""
            print(f"  {payer:38.38} delete {bogus:3} payments ({amt:7.0f}€){extra}")

        print("-" * 72)
        print(f"TOTAL: {total_pay} bogus member_payments ({total_amt:.0f}€) across "
              f"{len(non_submitted)} clubs")
        print(f"       {len(non_submitted)} EXCEL_IMPORT transactions to delete")
        print(f"       {preserved_total} real app payment(s) preserved\n")

        if not args.execute:
            print("DRY-RUN: no changes made. Re-run with --execute to apply.")
            return 0

        # 3. Execute deletions.
        pay_res = await db.member_payments.delete_many(
            {"payment_id": {"$in": non_submitted_tx_ids}}
        )
        tx_res = await db.transactions.delete_many(
            {"_id": {"$in": [ObjectId(t) for t in non_submitted_tx_ids]}}
        )
        print(f"DELETED {pay_res.deleted_count} member_payments, "
              f"{tx_res.deleted_count} transactions.")
        return 0
    finally:
        client.close()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--env-file", default=".env.production")
    p.add_argument("--execute", action="store_true", help="Apply deletions (default: dry-run)")
    return asyncio.run(main_async(p.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
