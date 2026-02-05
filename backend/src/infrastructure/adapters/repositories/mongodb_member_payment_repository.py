"""MongoDB MemberPayment Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType
)
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.infrastructure.database import get_database


class MongoDBMemberPaymentRepository(MemberPaymentRepositoryPort):
    """MongoDB implementation of MemberPayment Repository.

    Note: club_id has been removed from the entity. Queries that previously
    filtered by club_id now take member_ids lists instead.
    """

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["member_payments"]
        # Indexes should be created via migration or at startup
        # {member_id: 1, payment_year: -1}
        # {payment_id: 1}

    def _to_domain(self, doc: dict) -> Optional[MemberPayment]:
        """Convert MongoDB document to domain entity."""
        if doc is None:
            return None
        return MemberPayment(
            id=str(doc.get("_id")),
            payment_id=doc.get("payment_id", ""),
            member_id=doc.get("member_id", ""),
            payment_year=doc.get("payment_year", 0),
            payment_type=MemberPaymentType(doc.get("payment_type", "licencia_kyu")),
            concept=doc.get("concept", ""),
            amount=doc.get("amount", 0.0),
            status=MemberPaymentStatus(doc.get("status", "pending")),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, member_payment: MemberPayment) -> dict:
        """Convert domain entity to MongoDB document."""
        doc = {
            "payment_id": member_payment.payment_id,
            "member_id": member_payment.member_id,
            "payment_year": member_payment.payment_year,
            "payment_type": member_payment.payment_type.value,
            "concept": member_payment.concept,
            "amount": member_payment.amount,
            "status": member_payment.status.value,
            "updated_at": datetime.utcnow()
        }
        if member_payment.id:
            doc["_id"] = ObjectId(member_payment.id)
        if member_payment.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = member_payment.created_at
        return doc

    async def create(self, member_payment: MemberPayment) -> MemberPayment:
        """Create a new member payment record."""
        doc = self._to_document(member_payment)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def create_bulk(self, payments: List[MemberPayment]) -> List[MemberPayment]:
        """Create multiple member payment records in bulk."""
        if not payments:
            return []

        docs = []
        for payment in payments:
            doc = self._to_document(payment)
            if "_id" in doc:
                del doc["_id"]
            docs.append(doc)

        result = await self.collection.insert_many(docs)
        created_docs = await self.collection.find(
            {"_id": {"$in": result.inserted_ids}}
        ).to_list(length=len(result.inserted_ids))

        return [self._to_domain(doc) for doc in created_docs]

    async def find_by_id(self, member_payment_id: str) -> Optional[MemberPayment]:
        """Find a member payment by ID."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(member_payment_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_member_id(
        self,
        member_id: str,
        limit: int = 100
    ) -> List[MemberPayment]:
        """Find all payments for a specific member."""
        cursor = self.collection.find(
            {"member_id": member_id}
        ).sort("payment_year", -1).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_member_year(
        self,
        member_id: str,
        payment_year: int
    ) -> List[MemberPayment]:
        """Find all payments for a member in a specific year."""
        cursor = self.collection.find({
            "member_id": member_id,
            "payment_year": payment_year
        })
        documents = await cursor.to_list(length=100)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_member_ids_year(
        self,
        member_ids: List[str],
        payment_year: int,
        status: Optional[MemberPaymentStatus] = None,
        limit: int = 500
    ) -> List[MemberPayment]:
        """Find all member payments for a list of members in a specific year."""
        if not member_ids:
            return []

        query = {
            "member_id": {"$in": member_ids},
            "payment_year": payment_year
        }
        if status:
            query["status"] = status.value

        cursor = self.collection.find(query).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_payment_id(self, payment_id: str) -> List[MemberPayment]:
        """Find all member payments linked to a parent payment."""
        cursor = self.collection.find({"payment_id": payment_id})
        documents = await cursor.to_list(length=500)
        return [self._to_domain(doc) for doc in documents]

    async def update(self, member_payment: MemberPayment) -> MemberPayment:
        """Update a member payment record."""
        if not member_payment.id:
            raise ValueError("MemberPayment ID is required for update")
        doc = self._to_document(member_payment)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one(
            {"_id": ObjectId(member_payment.id)},
            {"$set": doc}
        )
        updated_doc = await self.collection.find_one(
            {"_id": ObjectId(member_payment.id)}
        )
        return self._to_domain(updated_doc)

    async def update_status_by_payment_id(
        self,
        payment_id: str,
        status: MemberPaymentStatus
    ) -> int:
        """Update status for all member payments linked to a parent payment."""
        result = await self.collection.update_many(
            {"payment_id": payment_id},
            {"$set": {"status": status.value, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count

    async def delete(self, member_payment_id: str) -> bool:
        """Delete a member payment record."""
        try:
            result = await self.collection.delete_one(
                {"_id": ObjectId(member_payment_id)}
            )
            return result.deleted_count > 0
        except Exception:
            return False

    async def get_summary_by_member_ids(
        self,
        member_ids: List[str],
        payment_year: int
    ) -> dict:
        """Get payment summary for a list of members in a specific year."""
        if not member_ids:
            return {
                "payment_year": payment_year,
                "by_type": {},
                "total_payments": 0,
                "total_amount": 0.0
            }

        pipeline = [
            {
                "$match": {
                    "member_id": {"$in": member_ids},
                    "payment_year": payment_year,
                    "status": MemberPaymentStatus.COMPLETED.value
                }
            },
            {
                "$group": {
                    "_id": "$payment_type",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"}
                }
            }
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=20)

        summary = {
            "payment_year": payment_year,
            "by_type": {},
            "total_payments": 0,
            "total_amount": 0.0
        }

        for result in results:
            payment_type = result["_id"]
            summary["by_type"][payment_type] = {
                "count": result["count"],
                "amount": result["total_amount"]
            }
            summary["total_payments"] += result["count"]
            summary["total_amount"] += result["total_amount"]

        return summary

    async def exists_for_member_year_type(
        self,
        member_id: str,
        payment_year: int,
        payment_type: MemberPaymentType
    ) -> bool:
        """Check if a payment already exists for member, year, and type."""
        count = await self.collection.count_documents({
            "member_id": member_id,
            "payment_year": payment_year,
            "payment_type": payment_type.value,
            "status": {"$in": [
                MemberPaymentStatus.PENDING.value,
                MemberPaymentStatus.COMPLETED.value
            ]}
        })
        return count > 0
