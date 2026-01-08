"""Repository port interfaces for Seminar domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.seminar import Seminar, SeminarStatus


class SeminarRepositoryPort(ABC):
    """Port for seminar repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Seminar]:
        """Find all seminars."""
        pass

    @abstractmethod
    async def find_by_id(self, seminar_id: str) -> Optional[Seminar]:
        """Find a seminar by ID."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Seminar]:
        """Find seminars by club ID."""
        pass

    @abstractmethod
    async def find_by_association_id(self, association_id: str, limit: int = 100) -> List[Seminar]:
        """Find seminars by association ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: SeminarStatus, limit: int = 100) -> List[Seminar]:
        """Find seminars by status."""
        pass

    @abstractmethod
    async def find_upcoming(self, limit: int = 100) -> List[Seminar]:
        """Find upcoming seminars."""
        pass

    @abstractmethod
    async def find_ongoing(self, limit: int = 100) -> List[Seminar]:
        """Find ongoing seminars."""
        pass

    @abstractmethod
    async def create(self, seminar: Seminar) -> Seminar:
        """Create a new seminar."""
        pass

    @abstractmethod
    async def update(self, seminar: Seminar) -> Seminar:
        """Update an existing seminar."""
        pass

    @abstractmethod
    async def delete(self, seminar_id: str) -> bool:
        """Delete a seminar by ID."""
        pass

    @abstractmethod
    async def exists(self, seminar_id: str) -> bool:
        """Check if a seminar exists."""
        pass
