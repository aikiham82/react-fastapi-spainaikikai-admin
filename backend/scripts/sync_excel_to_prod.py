"""CLI: sync Excel ASA 2025-2026 data to MongoDB production.

Usage:
    poetry run python -m scripts.sync_excel_to_prod \
        --excel /path/to/file.xlsx \
        [--env-file backend/.env.production] \
        [--execute]
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from scripts.sync.excel_loader import load_fees, load_insurances, load_members
from scripts.sync.planner import Planner
from scripts.sync.reporter import print_summary, write_report
from scripts.sync.writer import execute_plan


async def load_prod_snapshot(db) -> tuple[list, dict, dict, dict]:
    members = await db["members"].find({}).to_list(length=None)
    licenses_list = await db["licenses"].find({}).to_list(length=None)
    licenses = {str(l["member_id"]): l for l in licenses_list if l.get("member_id")}
    insurances_list = await db["insurances"].find({}).to_list(length=None)
    insurances = {
        (str(i["member_id"]), i.get("insurance_type", "")): i
        for i in insurances_list if i.get("member_id")
    }
    payments_list = await db["member_payments"].find({}).to_list(length=None)
    payments = {
        (str(p["member_id"]), p.get("payment_year"), p.get("payment_type")): p
        for p in payments_list if p.get("member_id")
    }
    return members, licenses, insurances, payments


async def main_async(args: argparse.Namespace) -> int:
    if args.env_file:
        load_dotenv(args.env_file, override=True)
    else:
        load_dotenv()

    mongo_uri = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    if not mongo_uri or not db_name:
        print("ERROR: MONGODB_URL or DATABASE_NAME not set", file=sys.stderr)
        return 2

    print(f"Target DB: {db_name} @ {mongo_uri[:mongo_uri.find('@') if '@' in mongo_uri else 20]}...")

    excel_path = Path(args.excel)
    if not excel_path.exists():
        print(f"ERROR: Excel file not found: {excel_path}", file=sys.stderr)
        return 2

    print(f"Loading Excel: {excel_path}")
    excel_members = load_members(excel_path)
    excel_fees = load_fees(excel_path)
    excel_insurances = load_insurances(excel_path)
    print(
        f"  members={len(excel_members)} fees={len(excel_fees)} "
        f"insurances={len(excel_insurances)}"
    )

    client = AsyncIOMotorClient(mongo_uri)
    try:
        db = client[db_name]
        print("Loading prod snapshot...")
        prod_members, prod_licenses, prod_insurances, prod_payments = (
            await load_prod_snapshot(db)
        )
        print(
            f"  prod_members={len(prod_members)} "
            f"licenses={len(prod_licenses)} "
            f"insurances={len(prod_insurances)} "
            f"payments={len(prod_payments)}"
        )

        planner = Planner(
            excel_members=excel_members,
            excel_fees=excel_fees,
            excel_insurances=excel_insurances,
            prod_members=prod_members,
            prod_licenses=prod_licenses,
            prod_insurances=prod_insurances,
            prod_payments=prod_payments,
        )
        plan = planner.build()

        report_path = write_report(plan, Path("exports"))
        print(f"\nReport written to: {report_path}")
        print_summary(plan)

        if args.execute:
            print("\n>>> EXECUTE MODE: writing to prod...")
            counts = await execute_plan(db, plan)
            print("Execution counts:")
            for k, v in counts.items():
                print(f"  {k:25s} {v:>6d}")
        else:
            print("\n[DRY-RUN] No changes written. Re-run with --execute to apply.")

        return 0
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--excel", required=True, help="Path to the ASA Excel file")
    parser.add_argument(
        "--env-file",
        help="Optional .env file to load (e.g. .env.production)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write to MongoDB. Without this, runs in dry-run mode.",
    )
    args = parser.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
