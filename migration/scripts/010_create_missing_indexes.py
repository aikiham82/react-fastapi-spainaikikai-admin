"""
Migration 010: Create Missing Indexes

This migration creates indexes that improve query performance:
1. member_payments: {member_id: 1, payment_year: -1} - for member payment lookups
2. member_payments: {payment_id: 1} - for finding payments by parent payment
3. insurances: {member_id: 1} - for insurance lookups by member

Note: After removing club_id from member_payments, the old club_id-based
indexes have been dropped (in migration 008). This creates the new
member_id-based indexes.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()


async def migrate():
    """Run the migration."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    member_payments = db["member_payments"]
    insurances = db["insurances"]

    print(f"Connected to MongoDB: {db_name}")

    # ============================================
    # Step 1: Create indexes on member_payments
    # ============================================
    print("\n=== Creating indexes on member_payments ===")

    # Index for finding payments by member and year (sorted by year desc)
    try:
        await member_payments.create_index(
            [("member_id", 1), ("payment_year", -1)],
            name="member_id_1_payment_year_-1"
        )
        print("Created index: member_id_1_payment_year_-1")
    except Exception as e:
        print(f"Index member_id_1_payment_year_-1 already exists or error: {e}")

    # Index for finding payments by parent payment ID
    try:
        await member_payments.create_index(
            "payment_id",
            name="payment_id_1"
        )
        print("Created index: payment_id_1")
    except Exception as e:
        print(f"Index payment_id_1 already exists or error: {e}")

    # Index for checking existing payments (used in exists_for_member_year_type)
    try:
        await member_payments.create_index(
            [("member_id", 1), ("payment_year", 1), ("payment_type", 1), ("status", 1)],
            name="member_year_type_status"
        )
        print("Created index: member_year_type_status")
    except Exception as e:
        print(f"Index member_year_type_status already exists or error: {e}")

    # ============================================
    # Step 2: Create indexes on insurances
    # ============================================
    print("\n=== Creating indexes on insurances ===")

    # Index for finding insurances by member
    try:
        await insurances.create_index(
            "member_id",
            name="member_id_1"
        )
        print("Created index: member_id_1")
    except Exception as e:
        print(f"Index member_id_1 already exists or error: {e}")

    # ============================================
    # Step 3: List all indexes
    # ============================================
    print("\n=== Current indexes ===")

    print("\nmember_payments indexes:")
    async for index in member_payments.list_indexes():
        print(f"  - {index.get('name')}: {index.get('key')}")

    print("\ninsurances indexes:")
    async for index in insurances.list_indexes():
        print(f"  - {index.get('name')}: {index.get('key')}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration by dropping the indexes."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    member_payments = db["member_payments"]
    insurances = db["insurances"]

    print(f"Rolling back migration in: {db_name}")

    # Drop indexes
    indexes_to_drop = [
        (member_payments, "member_id_1_payment_year_-1"),
        (member_payments, "payment_id_1"),
        (member_payments, "member_year_type_status"),
        (insurances, "member_id_1"),
    ]

    for collection, index_name in indexes_to_drop:
        try:
            await collection.drop_index(index_name)
            print(f"Dropped index: {index_name}")
        except Exception as e:
            print(f"Could not drop {index_name}: {e}")

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
