"""
Migration 008: Remove club_id from Insurance and MemberPayment entities

This migration:
1. Removes club_id field from insurances collection
2. Removes club_id field from member_payments collection

Note: club_id is kept on:
- payments collection (for club-level annual payments)
- invoices collection (derived from payment.club_id)

These entities have been normalized to derive club from member_id when needed.
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
    insurances = db["insurances"]
    member_payments = db["member_payments"]

    print(f"Connected to MongoDB: {db_name}")

    # ============================================
    # Step 1: Remove club_id from insurances
    # ============================================
    print("\n=== Cleaning up insurances collection ===")

    insurances_with_club_id = await insurances.count_documents({"club_id": {"$exists": True}})
    print(f"Insurances with club_id: {insurances_with_club_id}")

    if insurances_with_club_id > 0:
        result = await insurances.update_many(
            {},
            {"$unset": {"club_id": ""}}
        )
        print(f"Removed club_id from {result.modified_count} insurances")

    # ============================================
    # Step 2: Remove club_id from member_payments
    # ============================================
    print("\n=== Cleaning up member_payments collection ===")

    member_payments_with_club_id = await member_payments.count_documents({"club_id": {"$exists": True}})
    print(f"Member payments with club_id: {member_payments_with_club_id}")

    if member_payments_with_club_id > 0:
        result = await member_payments.update_many(
            {},
            {"$unset": {"club_id": ""}}
        )
        print(f"Removed club_id from {result.modified_count} member_payments")

    # ============================================
    # Step 3: Drop old indexes that used club_id
    # ============================================
    print("\n=== Dropping obsolete indexes ===")

    # Drop club_id indexes on insurances
    try:
        await insurances.drop_index("club_id_1")
        print("Dropped index club_id_1 on insurances")
    except Exception as e:
        print(f"No club_id index on insurances (or error): {e}")

    # Drop club_id indexes on member_payments
    for index_name in ["club_id_1", "club_id_1_payment_year_1", "club_id_1_payment_year_1_payment_type_1", "club_id_1_payment_year_1_status_1"]:
        try:
            await member_payments.drop_index(index_name)
            print(f"Dropped index {index_name} on member_payments")
        except Exception:
            pass

    # ============================================
    # Verification
    # ============================================
    print("\n=== Verification ===")

    remaining = {
        "insurances.club_id": await insurances.count_documents({"club_id": {"$exists": True}}),
        "member_payments.club_id": await member_payments.count_documents({"club_id": {"$exists": True}}),
    }

    all_clean = True
    for field, count in remaining.items():
        if count > 0:
            print(f"WARNING: {count} documents still have {field}")
            all_clean = False

    if all_clean:
        print("All club_id fields successfully removed!")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration.

    This rollback re-adds club_id by looking up each document's member_id
    and copying the member's club_id.
    """
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    insurances = db["insurances"]
    member_payments = db["member_payments"]
    members = db["members"]

    print(f"Rolling back migration in: {db_name}")
    print("WARNING: This will restore club_id by looking up each document's member.")

    from bson import ObjectId

    # Restore club_id on insurances
    print("\n=== Restoring club_id on insurances ===")
    cursor = insurances.find({"member_id": {"$exists": True, "$ne": None}})
    restored = 0
    async for doc in cursor:
        member_id = doc.get("member_id")
        if member_id:
            try:
                member = await members.find_one({"_id": ObjectId(member_id)})
                if not member:
                    member = await members.find_one({"_id": member_id})
                if member and member.get("club_id"):
                    await insurances.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {"club_id": member["club_id"]}}
                    )
                    restored += 1
            except Exception:
                pass
    print(f"Restored club_id for {restored} insurances")

    # Restore club_id on member_payments
    print("\n=== Restoring club_id on member_payments ===")
    cursor = member_payments.find({"member_id": {"$exists": True, "$ne": None}})
    restored = 0
    async for doc in cursor:
        member_id = doc.get("member_id")
        if member_id:
            try:
                member = await members.find_one({"_id": ObjectId(member_id)})
                if not member:
                    member = await members.find_one({"_id": member_id})
                if member and member.get("club_id"):
                    await member_payments.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {"club_id": member["club_id"]}}
                    )
                    restored += 1
            except Exception:
                pass
    print(f"Restored club_id for {restored} member_payments")

    # Recreate indexes
    print("\n=== Recreating indexes ===")
    await insurances.create_index("club_id")
    await member_payments.create_index([("club_id", 1), ("payment_year", 1)])
    await member_payments.create_index([("club_id", 1), ("payment_year", 1), ("status", 1)])
    print("Recreated indexes")

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
