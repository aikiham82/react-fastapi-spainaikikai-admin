"""
Migration 007: Cleanup Legacy Fields

This migration removes deprecated fields that were kept after previous migrations:
1. Removes old Spanish field names from licenses (grado_tecnico, categoria_instructor,
   categoria_edad, license_type) that were already renamed/migrated
2. Removes the deprecated 'role' field from users collection

Note: Migration 001 already renamed these fields to English. This script
removes the old Spanish fields if they still exist in any documents.
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
    users = db["users"]

    print(f"Connected to MongoDB: {db_name}")

    # ============================================
    # Step 1: Remove legacy Spanish fields from licenses
    # ============================================
    print("\n=== Cleaning up licenses collection ===")

    # Count documents with legacy fields
    legacy_counts = {
        "grado_tecnico": await licenses.count_documents({"grado_tecnico": {"$exists": True}}),
        "categoria_instructor": await licenses.count_documents({"categoria_instructor": {"$exists": True}}),
        "categoria_edad": await licenses.count_documents({"categoria_edad": {"$exists": True}}),
        "license_type": await licenses.count_documents({"license_type": {"$exists": True}}),
    }

    for field, count in legacy_counts.items():
        print(f"Documents with legacy field '{field}': {count}")

    # Remove all legacy fields from licenses
    result = await licenses.update_many(
        {},
        {"$unset": {
            "grado_tecnico": "",
            "categoria_instructor": "",
            "categoria_edad": "",
            "license_type": ""
        }}
    )
    print(f"Cleaned up {result.modified_count} license documents")

    # ============================================
    # Step 2: Remove deprecated 'role' field from users
    # ============================================
    print("\n=== Cleaning up users collection ===")

    users_with_role = await users.count_documents({"role": {"$exists": True}})
    print(f"Users with deprecated 'role' field: {users_with_role}")

    if users_with_role > 0:
        # Show sample of roles being removed
        sample_users = await users.find(
            {"role": {"$exists": True}},
            {"email": 1, "role": 1}
        ).limit(5).to_list(5)
        print("Sample users with role field:")
        for user in sample_users:
            print(f"  - {user.get('email')}: {user.get('role')}")

        result = await users.update_many(
            {},
            {"$unset": {"role": ""}}
        )
        print(f"Removed 'role' field from {result.modified_count} user documents")

    # ============================================
    # Verification
    # ============================================
    print("\n=== Verification ===")

    remaining_legacy = {
        "licenses.grado_tecnico": await licenses.count_documents({"grado_tecnico": {"$exists": True}}),
        "licenses.categoria_instructor": await licenses.count_documents({"categoria_instructor": {"$exists": True}}),
        "licenses.categoria_edad": await licenses.count_documents({"categoria_edad": {"$exists": True}}),
        "licenses.license_type": await licenses.count_documents({"license_type": {"$exists": True}}),
        "users.role": await users.count_documents({"role": {"$exists": True}}),
    }

    all_clean = True
    for field, count in remaining_legacy.items():
        if count > 0:
            print(f"WARNING: {count} documents still have {field}")
            all_clean = False

    if all_clean:
        print("All legacy fields successfully removed!")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration.

    WARNING: This rollback cannot restore the original field values
    since they were duplicate data. It will only recreate empty fields
    which is generally not useful.
    """
    print("WARNING: Cannot restore original values of legacy fields.")
    print("This rollback is a no-op since the legacy fields contained")
    print("duplicate data that has been migrated to new field names.")
    print("\nIf you need to restore data:")
    print("1. licenses: The data is in technical_grade, instructor_category, age_category")
    print("2. users: The role was derived from member.club_role and is no longer needed")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback())
    else:
        asyncio.run(migrate())
