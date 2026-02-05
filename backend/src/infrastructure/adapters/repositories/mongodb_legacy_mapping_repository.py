"""MongoDB LegacyMapping Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.legacy_mapping import LegacyMapping, EntityType
from src.application.ports.legacy_mapping_repository import LegacyMappingRepositoryPort
from src.infrastructure.database import get_database


class MongoDBLegacyMappingRepository(LegacyMappingRepositoryPort):
    """MongoDB implementation of LegacyMapping Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["legacy_mappings"]

    def _to_domain(self, doc: dict) -> Optional[LegacyMapping]:
        if doc is None:
            return None
        return LegacyMapping(
            id=str(doc.get("_id")),
            entity_type=EntityType(doc.get("entity_type", "member")),
            entity_id=doc.get("entity_id", ""),
            legacy_id=doc.get("legacy_id", ""),
            legacy_system=doc.get("legacy_system", ""),
            metadata=doc.get("metadata"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, mapping: LegacyMapping) -> dict:
        doc = {
            "entity_type": mapping.entity_type.value,
            "entity_id": mapping.entity_id,
            "legacy_id": mapping.legacy_id,
            "legacy_system": mapping.legacy_system,
            "metadata": mapping.metadata,
            "updated_at": datetime.utcnow()
        }
        if mapping.id:
            doc["_id"] = ObjectId(mapping.id)
        if mapping.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = mapping.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[LegacyMapping]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, mapping_id: str) -> Optional[LegacyMapping]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(mapping_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> List[LegacyMapping]:
        cursor = self.collection.find({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        })
        documents = await cursor.to_list(length=None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_legacy_id(
        self,
        entity_type: EntityType,
        legacy_id: str,
        legacy_system: Optional[str] = None
    ) -> Optional[LegacyMapping]:
        query = {
            "entity_type": entity_type.value,
            "legacy_id": legacy_id
        }
        if legacy_system:
            query["legacy_system"] = legacy_system
        doc = await self.collection.find_one(query)
        return self._to_domain(doc) if doc else None

    async def find_by_entity_type(
        self,
        entity_type: EntityType,
        limit: int = 100
    ) -> List[LegacyMapping]:
        cursor = self.collection.find({"entity_type": entity_type.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, mapping: LegacyMapping) -> LegacyMapping:
        doc = self._to_document(mapping)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, mapping: LegacyMapping) -> LegacyMapping:
        if not mapping.id:
            raise ValueError("LegacyMapping ID is required for update")
        doc = self._to_document(mapping)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one(
            {"_id": ObjectId(mapping.id)},
            {"$set": doc}
        )
        updated_doc = await self.collection.find_one({"_id": ObjectId(mapping.id)})
        return self._to_domain(updated_doc)

    async def delete(self, mapping_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(mapping_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def delete_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> int:
        result = await self.collection.delete_many({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        })
        return result.deleted_count

    async def exists(self, mapping_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(mapping_id)})
            return count > 0
        except Exception:
            return False

    async def exists_by_legacy_id(
        self,
        entity_type: EntityType,
        legacy_id: str,
        legacy_system: Optional[str] = None
    ) -> bool:
        query = {
            "entity_type": entity_type.value,
            "legacy_id": legacy_id
        }
        if legacy_system:
            query["legacy_system"] = legacy_system
        count = await self.collection.count_documents(query)
        return count > 0
