"""Legacy mapping domain entity for storing external system identifiers."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class EntityType(str, Enum):
    """Types of entities that can have legacy mappings."""
    MEMBER = "member"
    LICENSE = "license"
    CLUB = "club"
    ASSOCIATION = "association"
    PAYMENT = "payment"
    INSURANCE = "insurance"


@dataclass
class LegacyMapping:
    """Legacy mapping domain entity.

    This entity stores mappings between internal entity IDs and
    external/legacy system identifiers. Useful for:
    - Maintaining references to old system IDs
    - Tracking data imported from spreadsheets or other sources
    - Federation ID mappings
    """
    id: Optional[str] = None
    entity_type: EntityType = EntityType.MEMBER
    entity_id: str = ""  # Internal ID of the entity
    legacy_id: str = ""  # External/legacy system ID
    legacy_system: str = ""  # Name of the external system (e.g., "federation", "excel_import")
    metadata: Optional[dict] = None  # Additional legacy data
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate the legacy mapping entity."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()

        if not self.entity_id or not self.entity_id.strip():
            raise ValueError("Entity ID cannot be empty")
        if not self.legacy_id or not self.legacy_id.strip():
            raise ValueError("Legacy ID cannot be empty")

    def update_metadata(self, new_metadata: dict) -> None:
        """Update the metadata dictionary.

        Args:
            new_metadata: New metadata to merge with existing.
        """
        if self.metadata is None:
            self.metadata = {}
        self.metadata.update(new_metadata)
        self.updated_at = datetime.now()

    def get_metadata_value(self, key: str, default=None):
        """Get a value from metadata.

        Args:
            key: The metadata key to retrieve.
            default: Default value if key not found.

        Returns:
            The value or default.
        """
        if self.metadata is None:
            return default
        return self.metadata.get(key, default)
