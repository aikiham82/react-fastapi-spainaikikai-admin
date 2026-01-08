"""MongoDB Member Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.member import Member, MemberStatus
from src.application.ports.member_repository import MemberRepositoryPort
from src.infrastructure.database import get_database


class MongoDBMemberRepository(MemberRepositoryPort):
    """MongoDB implementation of Member Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["members"]

    def _to_domain(self, doc: dict) -> Optional[Member]:
        if doc is None:
            return None
        return Member(
            id=str(doc.get("_id")),
            first_name=doc.get("first_name", ""),
            last_name=doc.get("last_name", ""),
            dni=doc.get("dni", ""),
            email=doc.get("email", ""),
            phone=doc.get("phone", ""),
            address=doc.get("address", ""),
            city=doc.get("city", ""),
            province=doc.get("province", ""),
            postal_code=doc.get("postal_code", ""),
            country=doc.get("country", "Spain"),
            birth_date=doc.get("birth_date"),
            federation_number=doc.get("federation_number", ""),
            club_id=doc.get("club_id"),
            status=MemberStatus(doc.get("status", "active")),
            registration_date=doc.get("registration_date"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, member: Member) -> dict:
        doc = {
            "first_name": member.first_name,
            "last_name": member.last_name,
            "dni": member.dni,
            "email": member.email,
            "phone": member.phone,
            "address": member.address,
            "city": member.city,
            "province": member.province,
            "postal_code": member.postal_code,
            "country": member.country,
            "birth_date": member.birth_date,
            "federation_number": member.federation_number,
            "club_id": member.club_id,
            "status": member.status.value,
            "registration_date": member.registration_date,
            "updated_at": datetime.utcnow()
        }
        if member.id:
            doc["_id"] = ObjectId(member.id)
        if member.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = member.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[Member]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, member_id: str) -> Optional[Member]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(member_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_dni(self, dni: str) -> Optional[Member]:
        doc = await self.collection.find_one({"dni": dni})
        return self._to_domain(doc) if doc else None

    async def find_by_email(self, email: str) -> Optional[Member]:
        doc = await self.collection.find_one({"email": email})
        return self._to_domain(doc) if doc else None

    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Member]:
        cursor = self.collection.find({"club_id": club_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: MemberStatus, limit: int = 100) -> List[Member]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def search_by_name(self, name: str, limit: int = 100) -> List[Member]:
        cursor = self.collection.find({
            "$or": [
                {"first_name": {"$regex": name, "$options": "i"}},
                {"last_name": {"$regex": name, "$options": "i"}}
            ]
        }).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, member: Member) -> Member:
        doc = self._to_document(member)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, member: Member) -> Member:
        if not member.id:
            raise ValueError("Member ID is required for update")
        doc = self._to_document(member)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(member.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(member.id)})
        return self._to_domain(updated_doc)

    async def delete(self, member_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(member_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, member_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(member_id)})
            return count > 0
        except Exception:
            return False
