"""MongoDB Password Reset Token Repository Adapter."""

from typing import Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.password_reset_token import PasswordResetToken
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.infrastructure.database import get_database


class MongoDBPasswordResetTokenRepository(PasswordResetTokenRepositoryPort):
    """MongoDB implementation of Password Reset Token Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["password_reset_tokens"]

    def _to_domain(self, doc: dict) -> Optional[PasswordResetToken]:
        """Convert MongoDB document to domain entity."""
        if doc is None:
            return None

        return PasswordResetToken(
            id=str(doc.get("_id")),
            user_id=doc.get("user_id", ""),
            token=doc.get("token", ""),
            email=doc.get("email", ""),
            expires_at=doc.get("expires_at"),
            used_at=doc.get("used_at"),
            created_at=doc.get("created_at")
        )

    def _to_document(self, token: PasswordResetToken) -> dict:
        """Convert domain entity to MongoDB document."""
        doc = {
            "user_id": token.user_id,
            "token": token.token,
            "email": token.email.lower(),
            "expires_at": token.expires_at,
            "used_at": token.used_at,
            "created_at": token.created_at or datetime.utcnow()
        }

        if token.id:
            doc["_id"] = ObjectId(token.id)

        return doc

    async def find_by_token(self, token: str) -> Optional[PasswordResetToken]:
        """Find a password reset token by its token string."""
        doc = await self.collection.find_one({"token": token})
        return self._to_domain(doc)

    async def find_by_user_id(self, user_id: str) -> Optional[PasswordResetToken]:
        """Find the most recent active token for a user."""
        now = datetime.utcnow()
        doc = await self.collection.find_one(
            {
                "user_id": user_id,
                "used_at": None,
                "expires_at": {"$gt": now}
            },
            sort=[("created_at", -1)]
        )
        return self._to_domain(doc)

    async def create(self, token: PasswordResetToken) -> PasswordResetToken:
        """Create a new password reset token."""
        doc = self._to_document(token)
        if "_id" in doc:
            del doc["_id"]

        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, token: PasswordResetToken) -> PasswordResetToken:
        """Update an existing password reset token."""
        if not token.id:
            raise ValueError("Token ID is required for update")

        doc = self._to_document(token)
        if "_id" in doc:
            del doc["_id"]

        await self.collection.update_one(
            {"_id": ObjectId(token.id)},
            {"$set": doc}
        )

        updated_doc = await self.collection.find_one({"_id": ObjectId(token.id)})
        return self._to_domain(updated_doc)

    async def invalidate_user_tokens(self, user_id: str) -> int:
        """Invalidate all active tokens for a user."""
        now = datetime.utcnow()
        result = await self.collection.update_many(
            {
                "user_id": user_id,
                "used_at": None
            },
            {"$set": {"used_at": now}}
        )
        return result.modified_count

    async def delete_expired(self) -> int:
        """Delete all expired tokens."""
        now = datetime.utcnow()
        result = await self.collection.delete_many({
            "expires_at": {"$lt": now}
        })
        return result.deleted_count

    async def count_recent_requests(
        self,
        email: str,
        since: datetime
    ) -> int:
        """Count password reset requests for an email since a given time."""
        count = await self.collection.count_documents({
            "email": email.lower(),
            "created_at": {"$gte": since}
        })
        return count
