"""Repository port interfaces for License domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.license import License, LicenseStatus, LicenseType


class LicenseRepositoryPort(ABC):
    """Port for license repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[License]:
        """Find all licenses."""
        pass

    @abstractmethod
    async def find_by_id(self, license_id: str) -> Optional[License]:
        """Find a license by ID."""
        pass

    @abstractmethod
    async def find_by_license_number(self, license_number: str) -> Optional[License]:
        """Find a license by license number."""
        pass

    @abstractmethod
    async def find_by_member_id(self, member_id: str, limit: int = 100) -> List[License]:
        """Find licenses by member ID."""
        pass

    @abstractmethod
    async def find_by_club_id(self, club_id: str, limit: int = 100) -> List[License]:
        """Find licenses by club ID."""
        pass

    @abstractmethod
    async def find_by_status(self, status: LicenseStatus, limit: int = 100) -> List[License]:
        """Find licenses by status."""
        pass

    @abstractmethod
    async def find_expiring_soon(self, days_threshold: int = 30, limit: int = 100) -> List[License]:
        """Find licenses expiring soon."""
        pass

    @abstractmethod
    async def find_by_type(self, license_type: LicenseType, limit: int = 100) -> List[License]:
        """Find licenses by type."""
        pass

    @abstractmethod
    async def create(self, license: License) -> License:
        """Create a new license."""
        pass

    @abstractmethod
    async def update(self, license: License) -> License:
        """Update an existing license."""
        pass

    @abstractmethod
    async def delete(self, license_id: str) -> bool:
        """Delete a license by ID."""
        pass

    @abstractmethod
    async def exists(self, license_id: str) -> bool:
        """Check if a license exists."""
        pass
