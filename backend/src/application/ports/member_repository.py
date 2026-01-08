"""Repository port interfaces for Member domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.member import Member, MemberStatus


class MemberRepositoryPort(ABC):
    """Port for member repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Member]:
        """Find all members."""
        pass

    @abstractmethod
    async def find_by_id(self, member_id: str) -> Optional[Member]:
        """Find a member by ID."""
        pass

    @abstractmethod
    async def find_by_dni(self, dni: str) -> Optional[Member]:
        """Find a member by DNI."""
        pass

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[Member]:
        """Find a member by email."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Member]:
        """Find members by club ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: MemberStatus, limit: int = 100) -> List[Member]:
        """Find members by status."""
        pass

    @abstractmethod
    async def search_by_name(self, name: str, limit: int = 100) -> List[Member]:
        """Search members by name."""
        pass

    @abstractmethod
    async def create(self, member: Member) -> Member:
        """Create a new member."""
        pass

    @abstractmethod
    async def update(self, member: Member) -> Member:
        """Update an existing member."""
        pass

    @abstractmethod
    async def delete(self, member_id: str) -> bool:
        """Delete a member by ID."""
        pass

    @abstractmethod
    async def exists(self, member_id: str) -> bool:
        """Check if a member exists."""
        pass
