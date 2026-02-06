"""Seed initial price configurations into the database.

Run with: poetry run python scripts/seed_price_configurations.py
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env from backend directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

PRICE_CONFIGS = [
    {
        "key": "club_fee",
        "price": 100.0,
        "description": "Cuota de Club",
        "category": "club_fee",
        "is_active": True,
    },
    {
        "key": "kyu-none-adulto",
        "price": 15.0,
        "description": "Licencia KYU (adulto)",
        "category": "license",
        "is_active": True,
    },
    {
        "key": "kyu-none-infantil",
        "price": 5.0,
        "description": "Licencia KYU Infantil (≤14 años)",
        "category": "license",
        "is_active": True,
    },
    {
        "key": "dan-none-adulto",
        "price": 20.0,
        "description": "Licencia DAN",
        "category": "license",
        "is_active": True,
    },
    {
        "key": "dan-fukushidoin_shidoin-adulto",
        "price": 70.0,
        "description": "FUKUSHIDOIN/SHIDOIN (incluye RC + DAN)",
        "category": "license",
        "is_active": True,
    },
    {
        "key": "seguro_accidentes",
        "price": 15.0,
        "description": "Seguro de Accidentes",
        "category": "insurance",
        "is_active": True,
    },
    {
        "key": "seguro_rc",
        "price": 35.0,
        "description": "Seguro RC",
        "category": "insurance",
        "is_active": True,
    },
]


async def seed():
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "spainaikikai")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    collection = db["price_configurations"]

    now = datetime.utcnow()

    for config in PRICE_CONFIGS:
        existing = await collection.find_one({"key": config["key"]})
        if existing:
            print(f"  Exists: {config['key']} (skipping)")
            continue

        doc = {
            **config,
            "valid_from": None,
            "valid_until": None,
            "created_at": now,
            "updated_at": now,
        }
        await collection.insert_one(doc)
        print(f"  Created: {config['key']} = {config['price']}€")

    print("\nDone. Price configurations seeded.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
