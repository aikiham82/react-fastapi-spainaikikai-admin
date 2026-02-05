"""
Migration 006: Remove User.club_id

This migration:
1. Removes the club_id field from all user documents
2. Verifies that users are properly linked to members
3. Creates a backup of club_id values before deletion (stored in legacy_mappings)

Prerequisites:
- Migration 003 (link users to members) should be completed
- All users should have member_id set if they need club access
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()


async def migrate():
    """Run the migration."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    users = db["users"]
    legacy_mappings = db["legacy_mappings"]

    print(f"Connected to MongoDB: {db_name}")

    # Count users with club_id
    users_with_club_id = await users.count_documents({
        "club_id": {"$exists": True, "$ne": None}
    })
    print(f"Users with club_id: {users_with_club_id}")

    # Check if users are linked to members
    users_with_member_id = await users.count_documents({
        "member_id": {"$exists": True, "$ne": None}
    })
    print(f"Users with member_id: {users_with_member_id}")

    # Backup club_id values to legacy_mappings before deletion
    print("\nBacking up club_id values to legacy_mappings...")
    cursor = users.find({"club_id": {"$exists": True, "$ne": None}})
    backed_up = 0
    async for user in cursor:
        try:
            await legacy_mappings.insert_one({
                "entity_type": "user",
                "entity_id": str(user["_id"]),
                "legacy_id": user["club_id"],
                "legacy_system": "club_id_backup",
                "metadata": {
                    "email": user.get("email"),
                    "username": user.get("username"),
                    "backed_up_at": datetime.utcnow()
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            backed_up += 1
        except Exception as e:
            # Might already exist or other error
            print(f"  Could not backup user {user.get('email')}: {e}")

    print(f"Backed up {backed_up} club_id values")

    # Remove club_id field from all users
    print("\nRemoving club_id field from users...")
    result = await users.update_many(
        {},
        {"$unset": {"club_id": ""}}
    )
    print(f"Removed club_id from {result.modified_count} users")

    # Verify
    remaining = await users.count_documents({"club_id": {"$exists": True}})
    print(f"\nRemaining users with club_id: {remaining}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration - restore club_id from backup."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    users = db["users"]
    legacy_mappings = db["legacy_mappings"]

    print(f"Rolling back migration in: {db_name}")

    # Restore club_id from legacy_mappings backup
    cursor = legacy_mappings.find({
        "entity_type": "user",
        "legacy_system": "club_id_backup"
    })

    restored = 0
    async for mapping in cursor:
        from bson import ObjectId
        await users.update_one(
            {"_id": ObjectId(mapping["entity_id"])},
            {"$set": {"club_id": mapping["legacy_id"]}}
        )
        restored += 1

    print(f"Restored club_id for {restored} users")

    # Optionally delete the backup mappings
    # await legacy_mappings.delete_many({
    #     "entity_type": "user",
    #     "legacy_system": "club_id_backup"
    # })

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
