"""
Migration 009: Normalize Club._id to ObjectId

This migration:
1. Identifies clubs with string _id instead of ObjectId
2. Creates new documents with ObjectId _id
3. Updates references in: members, payments, invoices, seminars
4. Deletes the old string-based documents

IMPORTANT: This is a destructive migration. Back up your data first!

The mongodb_club_repository.py can be simplified after this migration
to remove the dual-query defensive code.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()


async def migrate():
    """Run the migration."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    clubs = db["clubs"]
    members = db["members"]
    payments = db["payments"]
    invoices = db["invoices"]
    seminars = db["seminars"]

    print(f"Connected to MongoDB: {db_name}")

    # ============================================
    # Step 1: Identify clubs with string _id
    # ============================================
    print("\n=== Analyzing clubs collection ===")

    # Count clubs with string vs ObjectId _id
    string_id_clubs = []
    object_id_clubs = []

    cursor = clubs.find({})
    async for club in cursor:
        club_id = club.get("_id")
        if isinstance(club_id, ObjectId):
            object_id_clubs.append(club)
        elif isinstance(club_id, str):
            string_id_clubs.append(club)
        else:
            print(f"WARNING: Unknown _id type for club: {type(club_id)}")

    print(f"Clubs with ObjectId _id: {len(object_id_clubs)}")
    print(f"Clubs with string _id: {len(string_id_clubs)}")

    if not string_id_clubs:
        print("\nNo string-based club IDs found. Migration not needed.")
        client.close()
        return

    # ============================================
    # Step 2: Migrate each string-id club
    # ============================================
    print("\n=== Migrating string-id clubs ===")

    id_mapping = {}  # old_string_id -> new_objectid

    for club in string_id_clubs:
        old_id = str(club["_id"])
        print(f"\nProcessing club: {club.get('name', 'Unknown')} (id: {old_id})")

        # Create new document with ObjectId
        new_doc = {k: v for k, v in club.items() if k != "_id"}
        result = await clubs.insert_one(new_doc)
        new_id = result.inserted_id
        id_mapping[old_id] = new_id
        print(f"  Created new document with ObjectId: {new_id}")

        # Update references in members
        member_result = await members.update_many(
            {"club_id": old_id},
            {"$set": {"club_id": str(new_id)}}
        )
        if member_result.modified_count > 0:
            print(f"  Updated {member_result.modified_count} members")

        # Update references in payments
        payment_result = await payments.update_many(
            {"club_id": old_id},
            {"$set": {"club_id": str(new_id)}}
        )
        if payment_result.modified_count > 0:
            print(f"  Updated {payment_result.modified_count} payments")

        # Update references in invoices
        invoice_result = await invoices.update_many(
            {"club_id": old_id},
            {"$set": {"club_id": str(new_id)}}
        )
        if invoice_result.modified_count > 0:
            print(f"  Updated {invoice_result.modified_count} invoices")

        # Update references in seminars (host_club_id)
        seminar_result = await seminars.update_many(
            {"host_club_id": old_id},
            {"$set": {"host_club_id": str(new_id)}}
        )
        if seminar_result.modified_count > 0:
            print(f"  Updated {seminar_result.modified_count} seminars")

        # Delete old document
        await clubs.delete_one({"_id": old_id})
        print(f"  Deleted old document with string id")

    # ============================================
    # Step 3: Verification
    # ============================================
    print("\n=== Verification ===")

    # Check for remaining string IDs
    remaining_string_ids = 0
    cursor = clubs.find({})
    async for club in cursor:
        if isinstance(club.get("_id"), str):
            remaining_string_ids += 1

    if remaining_string_ids > 0:
        print(f"WARNING: {remaining_string_ids} clubs still have string _id")
    else:
        print("All club _id fields are now ObjectId!")

    # Print mapping for reference
    print("\n=== ID Mapping (old -> new) ===")
    for old_id, new_id in id_mapping.items():
        print(f"  {old_id} -> {new_id}")

    client.close()
    print("\nMigration completed successfully!")
    print("\nNOTE: You should now simplify mongodb_club_repository.py")
    print("to remove the dual-query defensive code.")


async def rollback():
    """Rollback the migration.

    WARNING: This rollback cannot fully restore the original string IDs
    since we don't know what the original string values were.
    It would require restoring from backup.
    """
    print("WARNING: This migration cannot be automatically rolled back.")
    print("The original string _id values cannot be restored programmatically.")
    print("\nTo rollback:")
    print("1. Restore from backup taken before migration")
    print("2. Or manually recreate the string-id documents if needed")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
