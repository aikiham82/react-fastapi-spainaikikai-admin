"""MongoDB Payment Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.payment import Payment, PaymentStatus, PaymentType
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.infrastructure.database import get_database


class MongoDBPaymentRepository(PaymentRepositoryPort):
    """MongoDB implementation of Payment Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["payments"]

    def _to_domain(self, doc: dict) -> Optional[Payment]:
        if doc is None:
            return None
        return Payment(
            id=str(doc.get("_id")),
            member_id=doc.get("member_id"),
            club_id=doc.get("club_id"),
            payment_type=PaymentType(doc.get("payment_type", "annual_quota")),
            amount=doc.get("amount", 0.0),
            status=PaymentStatus(doc.get("status", "pending")),
            payment_date=doc.get("payment_date"),
            transaction_id=doc.get("transaction_id"),
            redsys_response=doc.get("redsys_response"),
            error_message=doc.get("error_message"),
            refund_amount=doc.get("refund_amount"),
            refund_date=doc.get("refund_date"),
            related_entity_id=doc.get("related_entity_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, payment: Payment) -> dict:
        doc = {
            "member_id": payment.member_id,
            "club_id": payment.club_id,
            "payment_type": payment.payment_type.value,
            "amount": payment.amount,
            "status": payment.status.value,
            "payment_date": payment.payment_date,
            "transaction_id": payment.transaction_id,
            "redsys_response": payment.redsys_response,
            "error_message": payment.error_message,
            "refund_amount": payment.refund_amount,
            "refund_date": payment.refund_date,
            "related_entity_id": payment.related_entity_id,
            "updated_at": datetime.utcnow()
        }
        if payment.id:
            doc["_id"] = ObjectId(payment.id)
        if payment.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = payment.created_at
        return doc

    async def find_all(self, limit: int = 100) -> List[Payment]:
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, payment_id: str) -> Optional[Payment]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(payment_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[Payment]:
        cursor = self.collection.find({"member_id": member_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Payment]:
        cursor = self.collection.find({"club_id": club_id}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: PaymentStatus, limit: int = 100) -> List[Payment]:
        cursor = self.collection.find({"status": status.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_type(self, payment_type: PaymentType, limit: int = 100) -> List[Payment]:
        cursor = self.collection.find({"payment_type": payment_type.value}).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_transaction_id(self, transaction_id: str) -> Optional[Payment]:
        doc = await self.collection.find_one({"transaction_id": transaction_id})
        return self._to_domain(doc) if doc else None

    async def find_by_date_range(
        self,
        start_date: Optional[str],
        end_date: Optional[str],
        limit: int = 100
    ) -> List[Payment]:
        query = {}
        if start_date:
            query["payment_date"] = {"$gte": datetime.fromisoformat(start_date)}
        if end_date:
            if "payment_date" not in query:
                query["payment_date"] = {}
            query["payment_date"]["$lte"] = datetime.fromisoformat(end_date)
        cursor = self.collection.find(query).limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def create(self, payment: Payment) -> Payment:
        doc = self._to_document(payment)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, payment: Payment) -> Payment:
        if not payment.id:
            raise ValueError("Payment ID is required for update")
        doc = self._to_document(payment)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one({"_id": ObjectId(payment.id)}, {"$set": doc})
        updated_doc = await self.collection.find_one({"_id": ObjectId(payment.id)})
        return self._to_domain(updated_doc)

    async def delete(self, payment_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(payment_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, payment_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(payment_id)})
            return count > 0
        except Exception:
            return False
