"""
Migration 002: Add Member Club Role

This migration:
1. Adds club_role field to all members with default "member"
2. Sets club_role="admin" for members whose email matches a user with role="club_admin"
3. Creates indexes for faster club_role queries
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
    members = db["members"]
    users = db["users"]

    print(f"Connected to MongoDB: {db_name}")

    # Count total members
    total = await members.count_documents({})
    print(f"Total members to process: {total}")

    # Step 1: Set default club_role="member" for all members missing the field
    default_result = await members.update_many(
        {"club_role": {"$exists": False}},
        {"$set": {"club_role": "member"}}
    )
    print(f"Set default club_role='member': {default_result.modified_count}")

    # Step 2: Find all club_admin users and their associated emails
    club_admin_cursor = users.find({"role": "club_admin"})
    club_admins = await club_admin_cursor.to_list(length=None)
    print(f"Found {len(club_admins)} club_admin users")

    # Step 3: For each club_admin user, find matching member by email and set club_role="admin"
    admins_updated = 0
    for user in club_admins:
        user_email = user.get("email")
        user_club_id = user.get("club_id")
        if user_email and user_club_id:
            result = await members.update_one(
                {"email": user_email, "club_id": user_club_id},
                {"$set": {"club_role": "admin"}}
            )
            if result.modified_count > 0:
                admins_updated += 1
                print(f"  Set admin role for member with email: {user_email}")

    print(f"Set club_role='admin' for {admins_updated} members")

    # Step 4: Create indexes
    await members.create_index("club_role")
    await members.create_index([("club_id", 1), ("club_role", 1)])
    print("Created indexes on club_role")

    # Verify migration
    admin_count = await members.count_documents({"club_role": "admin"})
    member_count = await members.count_documents({"club_role": "member"})
    print(f"\nMigration summary:")
    print(f"  Members with club_role='admin': {admin_count}")
    print(f"  Members with club_role='member': {member_count}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration (remove club_role field)."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    members = db["members"]

    print(f"Rolling back migration in: {db_name}")

    # Remove club_role field from all members
    result = await members.update_many(
        {},
        {"$unset": {"club_role": ""}}
    )
    print(f"Removed club_role from {result.modified_count} members")

    # Drop indexes
    try:
        await members.drop_index("club_role_1")
        await members.drop_index("club_id_1_club_role_1")
    except Exception:
        pass

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
