"""
Migration 005: Create Legacy Mappings Collection

This migration:
1. Creates the legacy_mappings collection
2. Creates indexes for efficient lookups
3. Optionally migrates legacy_* fields from other collections

Run with 'migrate_data' argument to also move legacy fields:
    python 005_create_legacy_mappings.py migrate_data
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()


async def migrate():
    """Run the migration - creates collection and indexes only."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    legacy_mappings = db["legacy_mappings"]

    print(f"Connected to MongoDB: {db_name}")

    # Create collection (implicit with first insert, but we can ensure indexes)
    print("Creating indexes on legacy_mappings collection...")

    # Unique compound index for entity_type + legacy_id
    await legacy_mappings.create_index(
        [("entity_type", 1), ("legacy_id", 1)],
        unique=True,
        name="entity_type_legacy_id_unique"
    )
    print("  Created unique index on (entity_type, legacy_id)")

    # Index for entity lookups
    await legacy_mappings.create_index(
        [("entity_type", 1), ("entity_id", 1)],
        name="entity_type_entity_id"
    )
    print("  Created index on (entity_type, entity_id)")

    # Index for legacy_system queries
    await legacy_mappings.create_index(
        "legacy_system",
        name="legacy_system"
    )
    print("  Created index on legacy_system")

    client.close()
    print("\nMigration completed successfully!")


async def migrate_data():
    """Migrate legacy_* fields from existing collections to legacy_mappings."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    legacy_mappings = db["legacy_mappings"]

    print(f"Connected to MongoDB: {db_name}")
    print("Migrating legacy fields to legacy_mappings collection...\n")

    # Collections to check for legacy fields
    collections_to_check = [
        ("members", "member"),
        ("licenses", "license"),
        ("clubs", "club"),
        ("associations", "association"),
        ("payments", "payment"),
        ("insurances", "insurance")
    ]

    total_migrated = 0

    for collection_name, entity_type in collections_to_check:
        collection = db[collection_name]

        # Find documents with any legacy_* field
        cursor = collection.find({
            "$or": [
                {"legacy_id": {"$exists": True}},
                {"legacy_federation_id": {"$exists": True}},
                {"legacy_member_id": {"$exists": True}},
                {"legacy_code": {"$exists": True}}
            ]
        })

        count = 0
        async for doc in cursor:
            entity_id = str(doc["_id"])
            metadata = {}

            # Extract all legacy_* fields
            legacy_id = None
            for key, value in doc.items():
                if key.startswith("legacy_") and value:
                    if key in ("legacy_id", "legacy_federation_id", "legacy_member_id", "legacy_code"):
                        legacy_id = legacy_id or str(value)
                    metadata[key] = value

            if legacy_id:
                # Insert into legacy_mappings
                try:
                    await legacy_mappings.insert_one({
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "legacy_id": legacy_id,
                        "legacy_system": "migration",
                        "metadata": metadata
                    })
                    count += 1
                except Exception as e:
                    # Likely duplicate, skip
                    print(f"  Skipped {entity_type} {entity_id}: {e}")

        if count > 0:
            print(f"  Migrated {count} records from {collection_name}")
            total_migrated += count

    print(f"\nTotal legacy mappings created: {total_migrated}")

    # Optionally remove legacy_* fields from source collections
    # (Uncomment if you want to clean up after migration)
    # for collection_name, _ in collections_to_check:
    #     collection = db[collection_name]
    #     await collection.update_many(
    #         {},
    #         {"$unset": {
    #             "legacy_id": "",
    #             "legacy_federation_id": "",
    #             "legacy_member_id": "",
    #             "legacy_code": ""
    #         }}
    #     )

    client.close()
    print("\nData migration completed!")


async def rollback():
    """Rollback the migration - drops the collection."""
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "aikikai_admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Rolling back migration in: {db_name}")

    await db.drop_collection("legacy_mappings")
    print("Dropped legacy_mappings collection")

    client.close()
    print("Rollback completed!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "rollback":
            asyncio.run(rollback())
        elif sys.argv[1] == "migrate_data":
            asyncio.run(migrate())
            asyncio.run(migrate_data())
        else:
            print(f"Unknown argument: {sys.argv[1]}")
            print("Usage: python 005_create_legacy_mappings.py [rollback|migrate_data]")
    else:
        asyncio.run(migrate())
