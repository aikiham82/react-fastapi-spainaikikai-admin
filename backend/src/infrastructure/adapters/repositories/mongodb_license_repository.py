"""MongoDB License Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from src.domain.entities.license import (
    License, LicenseStatus, LicenseType,
    TechnicalGrade, InstructorCategory, AgeCategory
)
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

        # Read category fields with fallback to legacy Spanish field names for migration
        technical_grade_val = doc.get("technical_grade") or doc.get("grado_tecnico", "kyu")
        instructor_category_val = doc.get("instructor_category") or doc.get("categoria_instructor", "none")
        age_category_val = doc.get("age_category") or doc.get("categoria_edad", "adulto")

        # Licenses are annual: if expiration_date is missing, derive as Dec 31 of issue year
        issue_date = doc.get("issue_date")
        expiration_date = doc.get("expiration_date")
        if not expiration_date and issue_date:
            expiration_date = datetime(issue_date.year, 12, 31, 23, 59, 59)

        # Note: club_id is no longer stored in License entity
        # It should be derived from the member's club_id
        license = License(
            id=str(doc.get("_id")),
            license_number=doc.get("license_number", ""),
            member_id=doc.get("member_id"),
            association_id=doc.get("association_id"),
            license_type=LicenseType(doc.get("license_type", "kyu")),
            grade=doc.get("grade", ""),
            status=LicenseStatus(doc.get("status", "active")),
            issue_date=issue_date,
            expiration_date=expiration_date,
            renewal_date=doc.get("renewal_date"),
            is_renewed=doc.get("is_renewed", False),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
            technical_grade=TechnicalGrade(technical_grade_val),
            instructor_category=InstructorCategory(instructor_category_val),
            age_category=AgeCategory(age_category_val),
            last_payment_id=doc.get("last_payment_id")
        )
        # Update status based on expiration date so expired licenses
        # are not returned as "active"
        license.check_and_update_status()
        return license

    def _to_document(self, license: License) -> dict:
        # Note: club_id is no longer stored - it's derived via member
        doc = {
            "license_number": license.license_number,
            "member_id": license.member_id,
            "association_id": license.association_id,
            "license_type": license.license_type.value,
            "grade": license.grade,
            "status": license.status.value,
            "issue_date": license.issue_date,
            "expiration_date": license.expiration_date,
            "renewal_date": license.renewal_date,
            "is_renewed": license.is_renewed,
            # Category fields with English names
            "technical_grade": license.technical_grade.value,
            "instructor_category": license.instructor_category.value,
            "age_category": license.age_category.value,
            "last_payment_id": license.last_payment_id,
            "updated_at": datetime.utcnow()
        }
        if license.id:
            doc["_id"] = ObjectId(license.id)
        if license.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = license.created_at
        return doc

    async def find_all(self, limit: int = 0) -> List[License]:
        cursor = self.collection.find()
        if limit > 0:
            cursor = cursor.limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
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

    async def find_by_member_id(self, member_id: str, limit: int = 0) -> List[License]:
        cursor = self.collection.find({"member_id": member_id}).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_member_ids(self, member_ids: List[str], limit: int = 0) -> List[License]:
        """Find licenses by a list of member IDs."""
        if not member_ids:
            return []
        cursor = self.collection.find({"member_id": {"$in": member_ids}})
        if limit > 0:
            cursor = cursor.limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_club_id(self, club_id: str, limit: int = 0) -> List[License]:
        """Find licenses by club ID.

        Since club_id is no longer stored in licenses, this method:
        1. Finds all member_ids in the specified club
        2. Queries licenses by those member_ids

        Note: For better performance, consider creating an index on members.club_id
        """
        # Get all member IDs for this club
        members_collection = self.db["members"]
        member_ids = await members_collection.distinct("_id", {"club_id": club_id})

        if not member_ids:
            return []

        # Convert ObjectIds to strings for the query
        member_id_strings = [str(m) for m in member_ids]

        # Find licenses for these members
        cursor = self.collection.find({"member_id": {"$in": member_id_strings}})
        if limit > 0:
            cursor = cursor.limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: LicenseStatus, limit: int = 0) -> List[License]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_expiring_soon(self, days_threshold: int = 30, limit: int = 0) -> List[License]:
        threshold_date = datetime.utcnow() + timedelta(days=days_threshold)
        cursor = self.collection.find({
            "status": "active",
            "expiration_date": {"$lte": threshold_date}
        }).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_type(self, license_type: LicenseType, limit: int = 0) -> List[License]:
        cursor = self.collection.find({"license_type": license_type.value}).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_active_by_member_year(
        self, member_id: str, payment_year: int,
        technical_grade: str, instructor_category: str
    ) -> Optional[License]:
        """Find an active license for a member matching type and year."""
        start = datetime(payment_year, 1, 1)
        end = datetime(payment_year, 12, 31, 23, 59, 59)
        doc = await self.collection.find_one({
            "member_id": member_id,
            "technical_grade": technical_grade,
            "instructor_category": instructor_category,
            "status": "active",
            "issue_date": {"$gte": start},
            "expiration_date": {"$lte": end},
        })
        return self._to_domain(doc) if doc else None

    async def count_by_license_number_prefix(self, prefix: str) -> int:
        """Count licenses with license_number starting with the given prefix."""
        import re
        pattern = f"^{re.escape(prefix)}"
        return await self.collection.count_documents(
            {"license_number": {"$regex": pattern}}
        )

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
