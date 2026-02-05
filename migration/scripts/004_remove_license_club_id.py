"""
Migration 004: Remove License.club_id

This migration:
1. Removes the club_id field from all license documents
2. Drops the index on club_id (if it exists)
3. Creates an index on member_id for better query performance

Note: Before running this migration, ensure that:
- All licenses have a valid member_id
- Frontend has been updated to derive club_id from member
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
    licenses = db["licenses"]
    members = db["members"]

    print(f"Connected to MongoDB: {db_name}")

    # Count total licenses
    total = await licenses.count_documents({})
    print(f"Total licenses: {total}")

    # Check how many have club_id
    with_club_id = await licenses.count_documents({"club_id": {"$exists": True, "$ne": None}})
    print(f"Licenses with club_id: {with_club_id}")

    # Verify all licenses have member_id before proceeding
    without_member_id = await licenses.count_documents({
        "$or": [
            {"member_id": {"$exists": False}},
            {"member_id": None}
        ]
    })
    if without_member_id > 0:
        print(f"WARNING: {without_member_id} licenses have no member_id!")
        print("These licenses won't have a club association after migration.")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("Migration aborted.")
            client.close()
            return

    # Step 1: Remove club_id field from all licenses
    result = await licenses.update_many(
        {},
        {"$unset": {"club_id": ""}}
    )
    print(f"Removed club_id from {result.modified_count} licenses")

    # Step 2: Drop club_id index if it exists
    try:
        await licenses.drop_index("club_id_1")
        print("Dropped index on club_id")
    except Exception as e:
        print(f"No club_id index to drop (or error): {e}")

    # Step 3: Ensure index on member_id for better performance
    await licenses.create_index("member_id")
    print("Created/confirmed index on member_id")

    # Verify migration
    remaining_with_club_id = await licenses.count_documents({"club_id": {"$exists": True}})
    print(f"\nMigration summary:")
    print(f"  Licenses remaining with club_id: {remaining_with_club_id}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration.

    WARNING: This rollback cannot restore the original club_id values.
    It will re-add the club_id field by looking up each license's member
    and copying the member's club_id.
    """
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    licenses = db["licenses"]
    members = db["members"]

    print(f"Rolling back migration in: {db_name}")
    print("WARNING: This will restore club_id by looking up each license's member.")

    # Restore club_id by looking up member
    cursor = licenses.find({"member_id": {"$exists": True, "$ne": None}})
    restored = 0
    async for license_doc in cursor:
        member_id = license_doc.get("member_id")
        if member_id:
            from bson import ObjectId
            member = await members.find_one({"_id": ObjectId(member_id)})
            if member and member.get("club_id"):
                await licenses.update_one(
                    {"_id": license_doc["_id"]},
                    {"$set": {"club_id": member["club_id"]}}
                )
                restored += 1

    print(f"Restored club_id for {restored} licenses")

    # Recreate club_id index
    await licenses.create_index("club_id")
    print("Recreated index on club_id")

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
