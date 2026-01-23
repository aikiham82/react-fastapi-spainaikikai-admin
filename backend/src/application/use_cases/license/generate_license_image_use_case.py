"""Generate License Image use case."""

from dataclasses import dataclass
from datetime import date
from typing import Tuple

from src.domain.exceptions.license import LicenseNotFoundError
from src.domain.exceptions.member import MemberNotFoundError
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.application.ports.license_image_service import (
    LicenseImageServicePort,
    LicenseImageData
)


@dataclass
class LicenseImageResult:
    """Result of license image generation."""
    image_bytes: bytes
    filename: str
    content_type: str = "image/png"


class GenerateLicenseImageUseCase:
    """Use case for generating a license image."""

    def __init__(
        self,
        license_repository: LicenseRepositoryPort,
        member_repository: MemberRepositoryPort,
        license_image_service: LicenseImageServicePort
    ):
        self.license_repository = license_repository
        self.member_repository = member_repository
        self.license_image_service = license_image_service

    def _calculate_license_year(self) -> int:
        """Calculate the current license year based on fiscal cutoff.

        License year changes on October 1st (month 10).
        Before October: current year
        October onwards: next year
        """
        today = date.today()
        return today.year + 1 if today.month >= 10 else today.year

    async def execute(self, license_id: str) -> LicenseImageResult:
        """Execute the use case.

        Args:
            license_id: The ID of the license to generate image for.

        Returns:
            LicenseImageResult containing image bytes and metadata.

        Raises:
            LicenseNotFoundError: If license not found.
            MemberNotFoundError: If member not found.
            LicenseImageGenerationError: If image generation fails.
        """
        # Get license
        license = await self.license_repository.find_by_id(license_id)
        if license is None:
            raise LicenseNotFoundError(license_id)

        # Get member
        if not license.member_id:
            raise MemberNotFoundError("License has no associated member")

        member = await self.member_repository.find_by_id(license.member_id)
        if member is None:
            raise MemberNotFoundError(license.member_id)

        # Calculate license year
        license_year = self._calculate_license_year()

        # Prepare image data
        image_data = LicenseImageData(
            license_number=license.license_number,
            first_name=member.first_name,
            last_name=member.last_name,
            dni=member.dni,
            birth_date=member.birth_date,
            expiration_date=license.expiration_date,
            license_year=license_year
        )

        # Generate image
        image_bytes = await self.license_image_service.generate_license_image(image_data)

        # Create filename
        safe_name = f"{member.last_name}_{member.first_name}".replace(" ", "_")
        filename = f"licencia_{safe_name}_{license_year}.png"

        return LicenseImageResult(
            image_bytes=image_bytes,
            filename=filename
        )
