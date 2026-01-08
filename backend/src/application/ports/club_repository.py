"""Repository port interfaces for Club domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.club import Club


class ClubRepositoryPort(ABC):
    """Port for club repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Club]:
        """Find all clubs."""
        pass

    @abstractmethod
    async def find_by_id(self, club_id: str) -> Optional[Club]:
        """Find a club by ID."""
        pass

    @abstractmethod
    async def find_by_association_id(self, association_id: str, limit: int = 100) -> List[Club]:
        """Find clubs by association ID."""
        pass

    @abstractmethod
    async def find_by_federation_number(self, federation_number: str) -> Optional[Club]:
        """Find a club by federation number."""
        pass

    @abstractmethod
    async def find_active(self, association_id: Optional[str] = None, limit: int = 100) -> List[Club]:
        """Find all active clubs optionally filtered by association."""
        pass

    @abstractmethod
    async def create(self, club: Club) -> Club:
        """Create a new club."""
        pass

    @abstractmethod
    async def update(self, club: Club) -> Club:
        """Update an existing club."""
        pass

    @abstractmethod
    async def delete(self, club_id: str) -> bool:
        """Delete a club by ID."""
        pass

    @abstractmethod
    async def exists(self, club_id: str) -> bool:
        """Check if a club exists."""
        pass
