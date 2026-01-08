"""MongoDB License Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from src.domain.entities.license import License, LicenseStatus, LicenseType
from src.application.ports.license_repository import LicenseRepositoryPort
from src.infrastructure.database import get_database


class MongoDBLicenseRepository(LicenseRepositoryPort):
    """MongoDB implementation of License Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["licenses"]

    def _to_domain(self, doc: dict) -> Optional[License]:
        if doc is None:
            return None
        return License(
            id=str(doc.get("_id")),
            license_number=doc.get("license_number", ""),
            member_id=doc.get("member_id"),
            club_id=doc.get("club_id"),
            association_id=doc.get("association_id"),
            license_type=LicenseType(doc.get("license_type", "kyu")),
            grade=doc.get("grade", ""),
            status=LicenseStatus(doc.get("status", "active")),
            issue_date=doc.get("issue_date"),
            expiration_date=doc.get("expiration_date"),
            renewal_date=doc.get("renewal_date"),
            is_renewed=doc.get("is_renewed", False),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, license: License) -> dict:
        doc = {
            "license_number": license.license_number,
            "member_id": license.member_id,
            "club_id": license.club_id,
            "association_id": license.association_id,
            "license_type": license.license_type.value,
            "grade": license.grade,
            "status": license.status.value,
            "issue_date": license.issue_date,
            "expiration_date": license.expiration_date,
            "renewal_date": license.renewal_date,
            "is_renewed": license.is_renewed,
            "updated_at": datetime.utcnow()
        }
        if license.id:
            doc["_id"] = ObjectId(license.id)
        if license.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = license.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[License]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, license_id: str) -> Optional[License]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(license_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_license_number(self, license_number: str) -> Optional[License]:
        doc = await self.collection.find_one({"license_number": license_number})
        return self._to_domain(doc) if doc else None

    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[License]:
        cursor = self.collection.find({"member_id": member_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[License]:
        cursor = self.collection.find({"club_id": club_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: LicenseStatus, limit: int = 100) -> List[License]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_expiring_soon(self, days_threshold: int = 30, limit: int = 100) -> List[License]:
        threshold_date = datetime.utcnow() + timedelta(days=days_threshold)
        cursor = self.collection.find({
            "status": "active",
            "expiration_date": {"$lte": threshold_date}
        }).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_type(self, license_type: LicenseType, limit: int = 100) -> List[License]:
        cursor = self.collection.find({"license_type": license_type.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, license: License) -> License:
        doc = self._to_document(license)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, license: License) -> License:
        if not license.id:
            raise ValueError("License ID is required for update")
        doc = self._to_document(license)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(license.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(license.id)})
        return self._to_domain(updated_doc)

    async def delete(self, license_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(license_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, license_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(license_id)})
            return count > 0
        except Exception:
            return False
