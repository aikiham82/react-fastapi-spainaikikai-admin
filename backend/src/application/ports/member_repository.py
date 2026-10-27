"""Repository port interfaces for Member domain."""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from src.domain.entities.member import Member, MemberStatus


class MemberRepositoryPort(ABC):
    """Port for member repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 0) -> List[Member]:
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
    async def claim_card_access(self, member_id: str) -> bool:
        """Mark the member's card as requested; true only for the one call that marks it."""
        pass

    @abstractmethod
    async def count_by_emails(self, emails: List[str]) -> Dict[str, int]:
        """How many members hold each email, lowercased."""
        pass

    @abstractmethod
    async def find_all_by_email(self, email: str) -> List[Member]:
        """Every member, club placeholders left out, whose file holds this email, case-insensitively."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 0) -> List[Member]:
        """Find members by club ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: MemberStatus, limit: int = 0) -> List[Member]:
        """Find members by status."""
        pass

    @abstractmethod
    async def search_by_name(self, name: str, limit: int = 0) -> List[Member]:
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
