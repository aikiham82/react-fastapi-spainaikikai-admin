"""Repository port interfaces for Association domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.association import Association


class AssociationRepositoryPort(ABC):
    """Port for association repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Association]:
        """Find all associations."""
        pass

    @abstractmethod
    async def find_by_id(self, association_id: str) -> Optional[Association]:
        """Find an association by ID."""
        pass

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[Association]:
        """Find an association by email."""
        pass

    @abstractmethod
    async def find_active(self, limit: int = 100) -> List[Association]:
        """Find all active associations."""
        pass

    @abstractmethod
    async def create(self, association: Association) -> Association:
        """Create a new association."""
        pass

    @abstractmethod
    async def update(self, association: Association) -> Association:
        """Update an existing association."""
        pass

    @abstractmethod
    async def delete(self, association_id: str) -> bool:
        """Delete an association by ID."""
        pass

    @abstractmethod
    async def exists(self, association_id: str) -> bool:
        """Check if an association exists."""
        pass
