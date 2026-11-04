"""Create the unique index that stops a completed payment line existing twice.

Dry run by default. From backend/:

    python -m scripts.create_member_payment_unique_index --env-file .env.production
    python -m scripts.create_member_payment_unique_index --env-file .env.production --execute
"""

from __future__ import annotations

import argparse
import asyncio
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

INDEX_NAME = "unique_completed_line"
INDEX_KEYS = [("member_id", 1), ("payment_year", 1), ("payment_type", 1)]
COMPLETED = {"status": "completed"}

DUPLICATES_PIPELINE = [
    {"$match": COMPLETED},
    {"$group": {
        "_id": {"member_id": "$member_id", "payment_year": "$payment_year", "payment_type": "$payment_type"},
        "lines": {"$sum": 1},
    }},
    {"$match": {"lines": {"$gt": 1}}},
]


async def run(mongodb_url: str, database_name: str, execute: bool) -> int:
    collection = AsyncIOMotorClient(mongodb_url)[database_name]["member_payments"]

    duplicates = await collection.aggregate(DUPLICATES_PIPELINE).to_list(length=None)
    print(f"{database_name}: {len(duplicates)} repeated completed lines")
    if duplicates:
        print(duplicates[:20])
        print("Refused: solve the repeated lines first")
        return 1

    if not execute:
        print(f"Dry run: would create {INDEX_NAME} on {INDEX_KEYS}, unique, partial on {COMPLETED}")
        return 0

    await collection.create_index(INDEX_KEYS, name=INDEX_NAME, unique=True, partialFilterExpression=COMPLETED)
    indexes = await collection.index_information()
    print(f"Created: {indexes[INDEX_NAME]}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", required=True)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    load_dotenv(args.env_file, override=True)
    return asyncio.run(run(os.environ["MONGODB_URL"], os.environ["DATABASE_NAME"], args.execute))


if __name__ == "__main__":
    raise SystemExit(main())
