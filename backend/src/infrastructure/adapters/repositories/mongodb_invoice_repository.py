"""MongoDB Invoice Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime, date

from src.domain.entities.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.application.ports.invoice_repository import InvoiceRepositoryPort
from src.infrastructure.database import get_database


class MongoDBInvoiceRepository(InvoiceRepositoryPort):
    """MongoDB implementation of Invoice Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["invoices"]

    def _line_items_to_dict(self, items: List[InvoiceLineItem]) -> List[dict]:
        return [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "tax_rate": item.tax_rate
            }
            for item in items
        ]

    def _dict_to_line_items(self, items_data: List[dict]) -> List[InvoiceLineItem]:
        return [
            InvoiceLineItem(
                description=item.get("description", ""),
                quantity=item.get("quantity", 1),
                unit_price=item.get("unit_price", 0.0),
                tax_rate=item.get("tax_rate", 0.0)
            )
            for item in items_data
        ]

    def _to_domain(self, doc: dict) -> Optional[Invoice]:
        if doc is None:
            return None
        return Invoice(
            id=str(doc.get("_id")),
            invoice_number=doc.get("invoice_number", ""),
            payment_id=doc.get("payment_id", ""),
            member_id=doc.get("member_id", ""),
            club_id=doc.get("club_id"),
            license_id=doc.get("license_id"),
            customer_name=doc.get("customer_name"),
            customer_address=doc.get("customer_address"),
            customer_tax_id=doc.get("customer_tax_id"),
            customer_email=doc.get("customer_email"),
            line_items=self._dict_to_line_items(doc.get("line_items", [])),
            subtotal=doc.get("subtotal", 0.0),
            tax_amount=doc.get("tax_amount", 0.0),
            total_amount=doc.get("total_amount", 0.0),
            status=InvoiceStatus(doc.get("status", "draft")),
            issue_date=doc.get("issue_date"),
            due_date=doc.get("due_date"),
            paid_date=doc.get("paid_date"),
            pdf_path=doc.get("pdf_path"),
            notes=doc.get("notes"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, invoice: Invoice) -> dict:
        doc = {
            "invoice_number": invoice.invoice_number,
            "payment_id": invoice.payment_id,
            "member_id": invoice.member_id,
            "club_id": invoice.club_id,
            "license_id": invoice.license_id,
            "customer_name": invoice.customer_name,
            "customer_address": invoice.customer_address,
            "customer_tax_id": invoice.customer_tax_id,
            "customer_email": invoice.customer_email,
            "line_items": self._line_items_to_dict(invoice.line_items),
            "subtotal": invoice.subtotal,
            "tax_amount": invoice.tax_amount,
            "total_amount": invoice.total_amount,
            "status": invoice.status.value,
            "issue_date": invoice.issue_date,
            "due_date": invoice.due_date,
            "paid_date": invoice.paid_date,
            "pdf_path": invoice.pdf_path,
            "notes": invoice.notes,
            "updated_at": datetime.utcnow()
        }
        if invoice.id:
            doc["_id"] = ObjectId(invoice.id)
        if invoice.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = invoice.created_at
        return doc

    async def find_all(self, limit: int = 0) -> List[Invoice]:
        cursor = self.collection.find().sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, invoice_id: str) -> Optional[Invoice]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(invoice_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        doc = await self.collection.find_one({"invoice_number": invoice_number})
        return self._to_domain(doc) if doc else None

    async def find_by_payment_id(self, payment_id: str) -> Optional[Invoice]:
        doc = await self.collection.find_one({"payment_id": payment_id})
        return self._to_domain(doc) if doc else None

    async def find_by_member_id(self, member_id: str, limit: int = 0) -> List[Invoice]:
        cursor = self.collection.find({"member_id": member_id}).sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_club_id(self, club_id: str, limit: int = 0) -> List[Invoice]:
        cursor = self.collection.find({"club_id": club_id}).sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_status(self, status: InvoiceStatus, limit: int = 0) -> List[Invoice]:
        cursor = self.collection.find({"status": status.value}).sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_date_range(
        self,
        start_date: Optional[date],
        end_date: Optional[date],
        limit: int = 0
    ) -> List[Invoice]:
        query = {}
        if start_date:
            query["issue_date"] = {"$gte": start_date.isoformat()}
        if end_date:
            if "issue_date" not in query:
                query["issue_date"] = {}
            query["issue_date"]["$lte"] = end_date.isoformat()
        cursor = self.collection.find(query).sort("issue_date", -1).limit(limit)
        documents = await cursor.to_list(length=limit if limit > 0 else None)
        return [self._to_domain(doc) for doc in documents]

    async def get_next_invoice_number(self, year: int) -> str:
        """Generate the next sequential invoice number for the year."""
        # Find the highest invoice number for this year
        prefix = f"{year}-"
        cursor = self.collection.find(
            {"invoice_number": {"$regex": f"^{prefix}"}}
        ).sort("invoice_number", -1).limit(1)
        docs = await cursor.to_list(length=1)

        if docs:
            # Extract the sequence number and increment
            last_number = docs[0].get("invoice_number", f"{year}-000000")
            try:
                sequence = int(last_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                sequence = 1
        else:
            sequence = 1

        return f"{year}-{sequence:06d}"

    async def create(self, invoice: Invoice) -> Invoice:
        doc = self._to_document(invoice)
        if "_id" in doc:
            del doc["_id"]
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, invoice: Invoice) -> Invoice:
        if not invoice.id:
            raise ValueError("Invoice ID is required for update")
        doc = self._to_document(invoice)
        if "_id" in doc:
            del doc["_id"]
        await self.collection.update_one(
            {"_id": ObjectId(invoice.id)},
            {"$set": doc}
        )
        updated_doc = await self.collection.find_one({"_id": ObjectId(invoice.id)})
        return self._to_domain(updated_doc)

    async def delete(self, invoice_id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(invoice_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, invoice_id: str) -> bool:
        try:
            count = await self.collection.count_documents({"_id": ObjectId(invoice_id)})
            return count > 0
        except Exception:
            return False

    async def exists_by_invoice_number(self, invoice_number: str) -> bool:
        count = await self.collection.count_documents({"invoice_number": invoice_number})
        return count > 0
