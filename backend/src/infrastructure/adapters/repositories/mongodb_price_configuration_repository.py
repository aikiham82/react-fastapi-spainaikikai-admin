"""MongoDB PriceConfiguration Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.price_configuration import PriceConfiguration
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort
from src.infrastructure.database import get_database


class MongoDBPriceConfigurationRepository(PriceConfigurationRepositoryPort):
    """MongoDB implementation of PriceConfiguration Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["price_configurations"]

    def _to_domain(self, doc: dict) -> Optional[PriceConfiguration]:
        if doc is None:
            return None
        return PriceConfiguration(
            id=str(doc.get("_id")),
            key=doc.get("key", ""),
            price=doc.get("price", 0.0),
            description=doc.get("description", ""),
            is_active=doc.get("is_active", True),
            valid_from=doc.get("valid_from"),
            valid_until=doc.get("valid_until"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, price_config: PriceConfiguration) -> dict:
        doc = {
            "key": price_config.key,
            "price": price_config.price,
            "description": price_config.description,
            "is_active": price_config.is_active,
            "valid_from": price_config.valid_from,
            "valid_until": price_config.valid_until,
            "updated_at": datetime.utcnow()
        }
        if price_config.id:
            doc["_id"] = ObjectId(price_config.id)
        if price_config.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = price_config.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[PriceConfiguration]:
        cursor = self.collection.find().sort("key", 1).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, price_id: str) -> Optional[PriceConfiguration]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(price_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_key(self, key: str) -> Optional[PriceConfiguration]:
        doc = await self.collection.find_one({"key": key})
        return self._to_domain(doc) if doc else None

    async def find_active(self, limit: int = 100) -> List[PriceConfiguration]:
        cursor = self.collection.find({"is_active": True}).sort("key", 1).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_license_type(
        self,
        technical_grade: str,
        instructor_category: str,
        age_category: str
    ) -> Optional[PriceConfiguration]:
        key = f"{technical_grade}-{instructor_category}-{age_category}"
        doc = await self.collection.find_one({"key": key, "is_active": True})
        return self._to_domain(doc) if doc else None

    async def create(self, price_config: PriceConfiguration) -> PriceConfiguration:
        doc = self._to_document(price_config)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, price_config: PriceConfiguration) -> PriceConfiguration:
        if not price_config.id:
            raise ValueError("PriceConfiguration ID is required for update")
        doc = self._to_document(price_config)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one(
            {"_id": ObjectId(price_config.id)},
            {"$set": doc}
        )
        updated_doc = await self.collection.find_one({"_id": ObjectId(price_config.id)})
        return self._to_domain(updated_doc)

    async def delete(self, price_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(price_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, price_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(price_id)})
            return count > 0
        except Exception:
            return False

    async def exists_by_key(self, key: str) -> bool:
        count = await self.collection.count_documents({"key": key})
        return count > 0
