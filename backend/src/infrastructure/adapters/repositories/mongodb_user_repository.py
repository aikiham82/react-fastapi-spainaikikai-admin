"""MongoDB User Repository Adapter."""

from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from src.domain.entities.user import User
from src.application.ports.repositories import UserRepositoryPort
from src.infrastructure.database import get_database


class MongoDBUserRepository(UserRepositoryPort):
    """MongoDB implementation of User Repository."""

    def __init__(self):
        self.db = get_database()
        self.collection = self.db["users"]

    def _to_domain(self, doc: dict) -> User:
        """Convert MongoDB document to domain entity."""
        if doc is None:
            return None
        
        return User(
            id=str(doc.get("_id")),
            email=doc.get("email", ""),
            username=doc.get("username", ""),
            hashed_password=doc.get("hashed_password", ""),
            is_active=doc.get("is_active", True),
            role=doc.get("role"),
            club_id=doc.get("club_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )

    def _to_document(self, user: User) -> dict:
        """Convert domain entity to MongoDB document."""
        doc = {
            "email": user.email,
            "username": user.username,
            "hashed_password": user.hashed_password,
            "is_active": user.is_active,
            "role": user.role,
            "club_id": user.club_id,
            "updated_at": datetime.utcnow()
        }
        
        if user.id:
            doc["_id"] = ObjectId(user.id)
        
        if user.created_at is None:
            doc["created_at"] = datetime.utcnow()
        else:
            doc["created_at"] = user.created_at
            
        return doc

    async def find_all(self, limit: int = 100) -> List[User]:
        """Find all users."""
        cursor = self.collection.find().limit(limit)
        documents = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in documents]

    async def find_by_id(self, user_id: str) -> Optional[User]:
        """Find a user by ID."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(user_id)})
            return self._to_domain(doc) if doc else None
        except Exception:
            return None

    async def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by email."""
        doc = await self.collection.find_one({"email": email})
        return self._to_domain(doc) if doc else None

    async def find_by_username(self, username: str) -> Optional[User]:
        """Find a user by username."""
        doc = await self.collection.find_one({"username": username})
        return self._to_domain(doc) if doc else None

    async def create(self, user: User) -> User:
        """Create a new user."""
        doc = self._to_document(user)
        # Remove _id for creation
        if "_id" in doc:
            del doc["_id"]
            
        result = await self.collection.insert_one(doc)
        created_doc = await self.collection.find_one({"_id": result.inserted_id})
        return self._to_domain(created_doc)

    async def update(self, user: User) -> User:
        """Update an existing user."""
        if not user.id:
            raise ValueError("User ID is required for update")
            
        doc = self._to_document(user)
        # Remove _id from update data
        if "_id" in doc:
            del doc["_id"]
            
        await self.collection.update_one(
            {"_id": ObjectId(user.id)}, 
            {"$set": doc}
        )
        
        updated_doc = await self.collection.find_one({"_id": ObjectId(user.id)})
        return self._to_domain(updated_doc)

    async def delete(self, user_id: str) -> bool:
        """Delete a user by ID."""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def exists(self, user_id: str) -> bool:
        """Check if a user exists."""
        try:
            count = await self.collection.count_documents({"_id": ObjectId(user_id)})
            return count > 0
        except Exception:
            return False