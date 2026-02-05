"""
Migration 001: Fix License Categories

This migration:
1. Renames Spanish field names to English in the licenses collection
2. Ensures all licenses have category fields with proper defaults
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

    print(f"Connected to MongoDB: {db_name}")

    # Count total licenses
    total = await licenses.count_documents({})
    print(f"Total licenses to process: {total}")

    # Step 1: Rename Spanish fields to English where they exist
    # and set defaults where fields are missing
    rename_result = await licenses.update_many(
        {"grado_tecnico": {"$exists": True}},
        {"$rename": {"grado_tecnico": "technical_grade"}}
    )
    print(f"Renamed grado_tecnico -> technical_grade: {rename_result.modified_count}")

    rename_result = await licenses.update_many(
        {"categoria_instructor": {"$exists": True}},
        {"$rename": {"categoria_instructor": "instructor_category"}}
    )
    print(f"Renamed categoria_instructor -> instructor_category: {rename_result.modified_count}")

    rename_result = await licenses.update_many(
        {"categoria_edad": {"$exists": True}},
        {"$rename": {"categoria_edad": "age_category"}}
    )
    print(f"Renamed categoria_edad -> age_category: {rename_result.modified_count}")

    # Step 2: Set defaults for licenses missing category fields
    default_result = await licenses.update_many(
        {"technical_grade": {"$exists": False}},
        {"$set": {"technical_grade": "kyu"}}
    )
    print(f"Set default technical_grade: {default_result.modified_count}")

    default_result = await licenses.update_many(
        {"instructor_category": {"$exists": False}},
        {"$set": {"instructor_category": "none"}}
    )
    print(f"Set default instructor_category: {default_result.modified_count}")

    default_result = await licenses.update_many(
        {"age_category": {"$exists": False}},
        {"$set": {"age_category": "adulto"}}
    )
    print(f"Set default age_category: {default_result.modified_count}")

    # Step 3: Create index on technical_grade for faster queries
    await licenses.create_index("technical_grade")
    print("Created index on technical_grade")

    # Verify migration
    sample = await licenses.find_one()
    if sample:
        print("\nSample document after migration:")
        print(f"  technical_grade: {sample.get('technical_grade')}")
        print(f"  instructor_category: {sample.get('instructor_category')}")
        print(f"  age_category: {sample.get('age_category')}")

    client.close()
    print("\nMigration completed successfully!")


async def rollback():
    """Rollback the migration (rename back to Spanish)."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    licenses = db["licenses"]

    print(f"Rolling back migration in: {db_name}")

    # Rename English fields back to Spanish
    await licenses.update_many(
        {"technical_grade": {"$exists": True}},
        {"$rename": {"technical_grade": "grado_tecnico"}}
    )
    await licenses.update_many(
        {"instructor_category": {"$exists": True}},
        {"$rename": {"instructor_category": "categoria_instructor"}}
    )
    await licenses.update_many(
        {"age_category": {"$exists": True}},
        {"$rename": {"age_category": "categoria_edad"}}
    )

    # Drop index
    try:
        await licenses.drop_index("technical_grade_1")
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
