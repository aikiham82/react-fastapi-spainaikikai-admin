"""MongoDB Insurance Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.infrastructure.database import get_database


class MongoDBInsuranceRepository(InsuranceRepositoryPort):
    """MongoDB implementation of Insurance Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["insurances"]

    def _to_domain(self, doc: dict) -> Optional[Insurance]:
        if doc is None:
            return None
        return Insurance(
            id=str(doc.get("_id")),
            member_id=doc.get("member_id"),
            club_id=doc.get("club_id"),
            insurance_type=InsuranceType(doc.get("insurance_type", "accident")),
            policy_number=doc.get("policy_number", ""),
            insurance_company=doc.get("insurance_company", ""),
            start_date=doc.get("start_date"),
            end_date=doc.get("end_date"),
            status=InsuranceStatus(doc.get("status", "active")),
            coverage_amount=doc.get("coverage_amount"),
            payment_id=doc.get("payment_id"),
            documents=doc.get("documents"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, insurance: Insurance) -> dict:
        doc = {
            "member_id": insurance.member_id,
            "club_id": insurance.club_id,
            "insurance_type": insurance.insurance_type.value,
            "policy_number": insurance.policy_number,
            "insurance_company": insurance.insurance_company,
            "start_date": insurance.start_date,
            "end_date": insurance.end_date,
            "status": insurance.status.value,
            "coverage_amount": insurance.coverage_amount,
            "payment_id": insurance.payment_id,
            "documents": insurance.documents,
            "updated_at": datetime.utcnow()
        }
        if insurance.id:
            doc["_id"] = ObjectId(insurance.id)
        if insurance.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = insurance.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[Insurance]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, insurance_id: str) -> Optional[Insurance]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(insurance_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[Insurance]:
        cursor = self.collection.find({"member_id": member_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Insurance]:
        cursor = self.collection.find({"club_id": club_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_policy_number(self, policy_number: str) -> Optional[Insurance]:
        doc = await self.collection.find_one({"policy_number": policy_number})
        return self._to_domain(doc) if doc else None

    async def find_by_status(self, status: InsuranceStatus, limit: int = 100) -> List[Insurance]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_type(self, insurance_type: InsuranceType, limit: int = 100) -> List[Insurance]:
        cursor = self.collection.find({"insurance_type": insurance_type.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_expiring_soon(self, days_threshold: int = 30, limit: int = 100) -> List[Insurance]:
        threshold_date = datetime.utcnow() + timedelta(days=days_threshold)
        cursor = self.collection.find({
            "status": "active",
            "end_date": {"$lte": threshold_date}
        }).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, insurance: Insurance) -> Insurance:
        doc = self._to_document(insurance)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, insurance: Insurance) -> Insurance:
        if not insurance.id:
            raise ValueError("Insurance ID is required for update")
        doc = self._to_document(insurance)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(insurance.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(insurance.id)})
        return self._to_domain(updated_doc)

    async def delete(self, insurance_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(insurance_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, insurance_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(insurance_id)})
            return count > 0
        except Exception:
            return False
