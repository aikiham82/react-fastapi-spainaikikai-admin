"""Service port interfaces for License image generation operations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class LicenseImageData:
    """Data required for generating a license image."""
    license_number: str
    first_name: str
    last_name: str
    dni: str
    birth_date: Optional[datetime]
    expiration_date: Optional[datetime]
    license_year: int


class LicenseImageServicePort(ABC):
    """Port for license image generation service operations."""

    @abstractmethod
    async def generate_license_image(self, data: LicenseImageData) -> bytes:
        """Generate a license image with member data overlaid on template.

        Args:
            data: License image data containing member and license info.

        Returns:
            PNG image bytes.
        """
        pass
