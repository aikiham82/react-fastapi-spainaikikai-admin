"""Repository port interfaces for Insurance domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType


class InsuranceRepositoryPort(ABC):
    """Port for insurance repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[Insurance]:
        """Find all insurances."""
        pass

    @abstractmethod
    async def find_by_id(self, insurance_id: str) -> Optional[Insurance]:
        """Find an insurance by ID."""
        pass

    @abstractmethod
    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[Insurance]:
        """Find insurances by member ID."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[Insurance]:
        """Find insurances by club ID."""
        pass

    @abstractmethod
    async def find_by_policy_number(self, policy_number: str) -> Optional[Insurance]:
        """Find an insurance by policy number."""
        pass

    @abstractmethod
    async def find_by_status(self, status: InsuranceStatus, limit: int = 100) -> List[Insurance]:
        """Find insurances by status."""
        pass

    @abstractmethod
    async def find_by_type(self, insurance_type: InsuranceType, limit: int = 100) -> List[Insurance]:
        """Find insurances by type."""
        pass

    @abstractmethod
    async def find_expiring_soon(self, days_threshold: int = 30, limit: int = 100) -> List[Insurance]:
        """Find insurances expiring soon."""
        pass

    @abstractmethod
    async def create(self, insurance: Insurance) -> Insurance:
        """Create a new insurance."""
        pass

    @abstractmethod
    async def update(self, insurance: Insurance) -> Insurance:
        """Update an existing insurance."""
        pass

    @abstractmethod
    async def delete(self, insurance_id: str) -> bool:
        """Delete an insurance by ID."""
        pass

    @abstractmethod
    async def exists(self, insurance_id: str) -> bool:
        """Check if an insurance exists."""
        pass
