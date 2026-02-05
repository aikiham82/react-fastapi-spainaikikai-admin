"""Repository port interfaces for PriceConfiguration domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.price_configuration import PriceConfiguration


class PriceConfigurationRepositoryPort(ABC):
    """Port for price configuration repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[PriceConfiguration]:
        """Find all price configurations."""
        pass

    @abstractmethod
    async def find_by_id(self, price_id: str) -> Optional[PriceConfiguration]:
        """Find a price configuration by ID."""
        pass

    @abstractmethod
    async def find_by_key(self, key: str) -> Optional[PriceConfiguration]:
        """Find a price configuration by key."""
        pass

    @abstractmethod
    async def find_active(self, limit: int = 100) -> List[PriceConfiguration]:
        """Find all active price configurations."""
        pass

    @abstractmethod
    async def find_by_license_type(
        self,
        technical_grade: str,
        instructor_category: str,
        age_category: str
    ) -> Optional[PriceConfiguration]:
        """Find price configuration for a specific license type combination."""
        pass

    @abstractmethod
    async def create(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Create a new price configuration."""
        pass

    @abstractmethod
    async def update(self, price_config: PriceConfiguration) -> PriceConfiguration:
        """Update an existing price configuration."""
        pass

    @abstractmethod
    async def delete(self, price_id: str) -> bool:
        """Delete a price configuration by ID."""
        pass

    @abstractmethod
    async def exists(self, price_id: str) -> bool:
        """Check if a price configuration exists."""
        pass

    @abstractmethod
    async def exists_by_key(self, key: str) -> bool:
        """Check if a price configuration exists by key."""
        pass
