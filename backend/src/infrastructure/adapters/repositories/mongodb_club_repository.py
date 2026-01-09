"""MongoDB Club Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.club import Club
from src.application.ports.club_repository import ClubRepositoryPort
from src.infrastructure.database import get_database


class MongoDBClubRepository(ClubRepositoryPort):
    """MongoDB implementation of Club Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["clubs"]

    def _to_domain(self, doc: dict) -> Optional[Club]:
        if doc is None:
            return None
        return Club(
            id=str(doc.get("_id")),
            name=doc.get("name", ""),
            address=doc.get("address", ""),
            city=doc.get("city", ""),
            province=doc.get("province", ""),
            postal_code=doc.get("postal_code", ""),
            country=doc.get("country", ""),
            phone=doc.get("phone", ""),
            email=doc.get("email", ""),
            association_id=doc.get("association_id"),
            is_active=doc.get("is_active", True),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, club: Club) -> dict:
        doc = {
            "name": club.name,
            "address": club.address,
            "city": club.city,
            "province": club.province,
            "postal_code": club.postal_code,
            "country": club.country,
            "phone": club.phone,
            "email": club.email,
            "association_id": club.association_id,
            "is_active": club.is_active,
            "updated_at": datetime.utcnow()
        }
        if club.id:
            doc["_id"] = ObjectId(club.id)
        if club.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = club.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[Club]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, club_id: str) -> Optional[Club]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(club_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_association_id(self, association_id: str, limit: int = 100) -> List[Club]:
        cursor = self.collection.find({"association_id": association_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_active(self, association_id: Optional[str] = None, limit: int = 100) -> List[Club]:
        query = {"is_active": True}
        if association_id:
            query["association_id"] = association_id
        cursor = self.collection.find(query).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, club: Club) -> Club:
        doc = self._to_document(club)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, club: Club) -> Club:
        if not club.id:
            raise ValueError("Club ID is required for update")
        doc = self._to_document(club)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(club.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(club.id)})
        return self._to_domain(updated_doc)

    async def delete(self, club_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(club_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, club_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(club_id)})
            return count > 0
        except Exception:
            return False
