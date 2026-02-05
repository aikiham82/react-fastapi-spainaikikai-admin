"""Repository port interface for LegacyMapping domain."""

from abc import ABC, abstractmethod
from typing import List, Optional

from src.domain.entities.legacy_mapping import LegacyMapping, EntityType


class LegacyMappingRepositoryPort(ABC):
    """Port for legacy mapping repository operations."""

    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[LegacyMapping]:
        """Find all legacy mappings."""
        pass

    @abstractmethod
    async def find_by_id(self, mapping_id: str) -> Optional[LegacyMapping]:
        """Find a legacy mapping by ID."""
        pass

    @abstractmethod
    async def find_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> List[LegacyMapping]:
        """Find all legacy mappings for a specific entity."""
        pass

    @abstractmethod
    async def find_by_legacy_id(
        self,
        entity_type: EntityType,
        legacy_id: str,
        legacy_system: Optional[str] = None
    ) -> Optional[LegacyMapping]:
        """Find a mapping by legacy ID."""
        pass

    @abstractmethod
    async def find_by_entity_type(
        self,
        entity_type: EntityType,
        limit: int = 100
    ) -> List[LegacyMapping]:
        """Find all legacy mappings for an entity type."""
        pass

    @abstractmethod
    async def create(self, mapping: LegacyMapping) -> LegacyMapping:
        """Create a new legacy mapping."""
        pass

    @abstractmethod
    async def update(self, mapping: LegacyMapping) -> LegacyMapping:
        """Update an existing legacy mapping."""
        pass

    @abstractmethod
    async def delete(self, mapping_id: str) -> bool:
        """Delete a legacy mapping by ID."""
        pass

    @abstractmethod
    async def delete_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str
    ) -> int:
        """Delete all legacy mappings for an entity.

        Returns:
            Number of mappings deleted.
        """
        pass

    @abstractmethod
    async def exists(self, mapping_id: str) -> bool:
        """Check if a legacy mapping exists."""
        pass

    @abstractmethod
    async def exists_by_legacy_id(
        self,
        entity_type: EntityType,
        legacy_id: str,
        legacy_system: Optional[str] = None
    ) -> bool:
        """Check if a legacy mapping exists by legacy ID."""
        pass
