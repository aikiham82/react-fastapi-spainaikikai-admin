"""MongoDB Association Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.association import Association
from src.application.ports.association_repository import AssociationRepositoryPort
from src.infrastructure.database import get_database


class MongoDBAssociationRepository(AssociationRepositoryPort):
    """MongoDB implementation of Association Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["associations"]

    def _to_domain(self, doc: dict) -> Optional[Association]:
        """Convert MongoDB document to domain entity."""
        if doc is None:
            return None

        return Association(
            id=str(doc.get("_id")),
            name=doc.get("name", ""),
            address=doc.get("address", ""),
            city=doc.get("city", ""),
            province=doc.get("province", ""),
            postal_code=doc.get("postal_code", ""),
            country=doc.get("country", ""),
            phone=doc.get("phone", ""),
            email=doc.get("email", ""),
            cif=doc.get("cif", ""),
            is_active=doc.get("is_active", True),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, association: Association) -> dict:
        """Convert domain entity to MongoDB document."""
        doc = {
            "name": association.name,
            "address": association.address,
            "city": association.city,
            "province": association.province,
            "postal_code": association.postal_code,
            "country": association.country,
            "phone": association.phone,
            "email": association.email,
            "cif": association.cif,
            "is_active": association.is_active,
            "updated_at": datetime.utcnow()
        }

        if association.id:
            doc["_id"] = ObjectId(association.id)

        if association.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = association.created_at

        return doc

    async def find_all(self, limit: int = 100) -> List[Association]:
        """Find all associations."""
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, association_id: str) -> Optional[Association]:
        """Find an association by ID."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(association_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_email(self, email: str) -> Optional[Association]:
        """Find an association by email."""
        doc = await self.collection.find_one({"email": email})
        return self._to_domain(doc) if doc else None

    async def find_active(self, limit: int = 100) -> List[Association]:
        """Find all active associations."""
        cursor = self.collection.find({"is_active": True}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, association: Association) -> Association:
        """Create a new association."""
        doc = self._to_document(association)
        if "_id" in doc:
            del doc["_id"]

        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, association: Association) -> Association:
        """Update an existing association."""
        if not association.id:
            raise ValueError("Association ID is required for update")

        doc = self._to_document(association)
        if "_id" in doc:
            del doc["_id"]

        await self.collection.update_one(
            {"_id": ObjectId(association.id)},
            {"$set": doc}
        )

        updated_doc = await self.collection.find_one({"_id": ObjectId(association.id)})
        return self._to_domain(updated_doc)

    async def delete(self, association_id: str) -> bool:
        """Delete an association by ID."""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(association_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, association_id: str) -> bool:
        """Check if an association exists."""
        try:
            count = await self.collection.count_documents({"_id": ObjectId(association_id)})
            return count > 0
        except Exception:
            return False
