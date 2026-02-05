"""
Migration 003: Link Users to Members and Convert Roles

This migration:
1. Links users to members by matching email addresses
2. Converts legacy 'role' field to new 'global_role':
   - association_admin -> super_admin
   - club_admin -> user (permissions now via Member.club_role)
   - None/other -> user
3. Creates indexes for efficient lookups
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
    users = db["users"]
    members = db["members"]

    print(f"Connected to MongoDB: {db_name}")

    # Count total users
    total_users = await users.count_documents({})
    print(f"Total users to process: {total_users}")

    # Step 1: Convert legacy roles to global_role
    # association_admin -> super_admin
    result = await users.update_many(
        {"role": "association_admin", "global_role": {"$exists": False}},
        {"$set": {"global_role": "super_admin"}}
    )
    print(f"Converted association_admin to super_admin: {result.modified_count}")

    # club_admin and others -> user
    result = await users.update_many(
        {"global_role": {"$exists": False}},
        {"$set": {"global_role": "user"}}
    )
    print(f"Set default global_role='user': {result.modified_count}")

    # Step 2: Link users to members by email
    user_cursor = users.find({"member_id": {"$exists": False}})
    users_linked = 0
    users_not_linked = 0

    async for user in user_cursor:
        user_email = user.get("email")
        if user_email:
            # Find a member with the same email
            member = await members.find_one({"email": user_email})
            if member:
                await users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"member_id": str(member["_id"])}}
                )
                users_linked += 1
                print(f"  Linked user {user_email} to member {member.get('first_name')} {member.get('last_name')}")
            else:
                users_not_linked += 1

    print(f"\nUsers linked to members: {users_linked}")
    print(f"Users without matching member: {users_not_linked}")

    # Step 3: Create indexes
    await users.create_index("member_id", sparse=True)
    await users.create_index("global_role")
    print("Created indexes on member_id and global_role")

    # Step 4: Create unique partial index for super_admin constraint
    # This ensures only one super_admin can exist
    try:
        await users.create_index(
            [("global_role", 1)],
            unique=True,
            partialFilterExpression={"global_role": "super_admin"},
            name="unique_super_admin"
        )
        print("Created unique partial index for super_admin constraint")
    except Exception as e:
        print(f"Note: Could not create unique super_admin index (may already exist or conflict): {e}")

    # Verify migration
    super_admin_count = await users.count_documents({"global_role": "super_admin"})
    regular_user_count = await users.count_documents({"global_role": "user"})
    linked_count = await users.count_documents({"member_id": {"$exists": True, "$ne": None}})

    print(f"\nMigration summary:")
    print(f"  Users with global_role='super_admin': {super_admin_count}")
    print(f"  Users with global_role='user': {regular_user_count}")
    print(f"  Users linked to members: {linked_count}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    users = db["users"]

    print(f"Rolling back migration in: {db_name}")

    # Remove new fields
    result = await users.update_many(
        {},
        {"$unset": {"global_role": "", "member_id": ""}}
    )
    print(f"Removed global_role and member_id from {result.modified_count} users")

    # Drop indexes
    try:
        await users.drop_index("member_id_1")
        await users.drop_index("global_role_1")
        await users.drop_index("unique_super_admin")
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
