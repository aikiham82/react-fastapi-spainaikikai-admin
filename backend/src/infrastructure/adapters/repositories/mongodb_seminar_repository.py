"""MongoDB Seminar Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.seminar import Seminar, SeminarStatus
from src.application.ports.seminar_repository import SeminarRepositoryPort
from src.infrastructure.database import get_database


class MongoDBSeminarRepository(SeminarRepositoryPort):
    """MongoDB implementation of Seminar Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["seminars"]

    def _to_domain(self, doc: dict) -> Optional[Seminar]:
        if doc is None:
            return None
        return Seminar(
            id=str(doc.get("_id")),
            title=doc.get("title", ""),
            description=doc.get("description", ""),
            instructor_name=doc.get("instructor_name", ""),
            venue=doc.get("venue", ""),
            address=doc.get("address", ""),
            city=doc.get("city", ""),
            province=doc.get("province", ""),
            start_date=doc.get("start_date"),
            end_date=doc.get("end_date"),
            price=doc.get("price", 0.0),
            max_participants=doc.get("max_participants"),
            current_participants=doc.get("current_participants", 0),
            club_id=doc.get("club_id"),
            association_id=doc.get("association_id"),
            status=SeminarStatus(doc.get("status", "upcoming")),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, seminar: Seminar) -> dict:
        doc = {
            "title": seminar.title,
            "description": seminar.description,
            "instructor_name": seminar.instructor_name,
            "venue": seminar.venue,
            "address": seminar.address,
            "city": seminar.city,
            "province": seminar.province,
            "start_date": seminar.start_date,
            "end_date": seminar.end_date,
            "price": seminar.price,
            "max_participants": seminar.max_participants,
            "current_participants": seminar.current_participants,
            "club_id": seminar.club_id,
            "association_id": seminar.association_id,
            "status": seminar.status.value,
            "updated_at": datetime.utcnow()
        }
        if seminar.id:
            doc["_id"] = ObjectId(seminar.id)
        if seminar.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = seminar.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, seminar_id: str) -> Optional[Seminar]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(seminar_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find({"club_id": club_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_association_id(self, association_id: str, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find({"association_id": association_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: SeminarStatus, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_upcoming(self, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find({
            "status": "upcoming",
            "start_date": {"$gte": datetime.utcnow()}
        }).sort("start_date", 1).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_ongoing(self, limit: int = 100) -> List[Seminar]:
        cursor = self.collection.find({"status": "ongoing"}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, seminar: Seminar) -> Seminar:
        doc = self._to_document(seminar)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, seminar: Seminar) -> Seminar:
        if not seminar.id:
            raise ValueError("Seminar ID is required for update")
        doc = self._to_document(seminar)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(seminar.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(seminar.id)})
        return self._to_domain(updated_doc)

    async def delete(self, seminar_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(seminar_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, seminar_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(seminar_id)})
            return count > 0
        except Exception:
            return False
