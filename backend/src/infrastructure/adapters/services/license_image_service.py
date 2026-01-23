"""License Image Service Implementation using Pillow."""

import os
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from src.application.ports.license_image_service import LicenseImageServicePort, LicenseImageData
from src.domain.exceptions.license import LicenseImageGenerationError


class LicenseImageService(LicenseImageServicePort):
    """Implementation of license image generation service using Pillow."""

    # Text positions (x, y) from PHP implementation
    POSITIONS = {
        "year": (1340, 260),
        "insurance": (1200, 340),
        "surname": (550, 460),
        "first_name": (450, 605),
        "birth_date": (1220, 605),
        "license_number": (450, 760),
        "dni": (1100, 760),
    }

    # Font sizes
    FONT_SIZES = {
        "year": 40,
        "insurance": 30,
        "surname": 40,
        "first_name": 40,
        "birth_date": 40,
        "license_number": 40,
        "dni": 40,
    }

    def __init__(self):
        """Initialize the license image service."""
        self.assets_dir = Path(__file__).parent.parent.parent / "assets"
        self.template_path = self.assets_dir / "Template.png"
        self.font_path = self.assets_dir / "PublicSans-Thin.ttf"
        self._validate_assets()

    def _validate_assets(self) -> None:
        """Validate that required assets exist."""
        if not self.template_path.exists():
            raise LicenseImageGenerationError(
                f"Template image not found at {self.template_path}"
            )
        if not self.font_path.exists():
            raise LicenseImageGenerationError(
                f"Font file not found at {self.font_path}"
            )

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        """Get font with specified size."""
        try:
            return ImageFont.truetype(str(self.font_path), size)
        except Exception as e:
            raise LicenseImageGenerationError(f"Failed to load font: {e}")

    def _format_date(self, date) -> str:
        """Format date for display on license."""
        if date is None:
            return ""
        try:
            return date.strftime("%d/%m/%Y")
        except (ValueError, AttributeError):
            return ""

    async def generate_license_image(self, data: LicenseImageData) -> bytes:
        """Generate a license image with member data overlaid on template.

        Args:
            data: License image data containing member and license info.

        Returns:
            PNG image bytes.
        """
        try:
            # Load template image
            image = Image.open(self.template_path)
            draw = ImageDraw.Draw(image)

            # Text color (black)
            text_color = (0, 0, 0)

            # Draw year
            year_font = self._get_font(self.FONT_SIZES["year"])
            draw.text(
                self.POSITIONS["year"],
                str(data.license_year),
                font=year_font,
                fill=text_color
            )

            # Draw insurance (expiration date or "SIN SEGURO")
            insurance_font = self._get_font(self.FONT_SIZES["insurance"])
            insurance_text = (
                self._format_date(data.expiration_date)
                if data.expiration_date
                else "SIN SEGURO"
            )
            draw.text(
                self.POSITIONS["insurance"],
                insurance_text,
                font=insurance_font,
                fill=text_color
            )

            # Draw surname (uppercase)
            surname_font = self._get_font(self.FONT_SIZES["surname"])
            draw.text(
                self.POSITIONS["surname"],
                data.last_name.upper(),
                font=surname_font,
                fill=text_color
            )

            # Draw first name (uppercase)
            first_name_font = self._get_font(self.FONT_SIZES["first_name"])
            draw.text(
                self.POSITIONS["first_name"],
                data.first_name.upper(),
                font=first_name_font,
                fill=text_color
            )

            # Draw birth date
            birth_date_font = self._get_font(self.FONT_SIZES["birth_date"])
            birth_date_text = self._format_date(data.birth_date)
            draw.text(
                self.POSITIONS["birth_date"],
                birth_date_text,
                font=birth_date_font,
                fill=text_color
            )

            # Draw license number
            license_number_font = self._get_font(self.FONT_SIZES["license_number"])
            draw.text(
                self.POSITIONS["license_number"],
                data.license_number,
                font=license_number_font,
                fill=text_color
            )

            # Draw DNI
            dni_font = self._get_font(self.FONT_SIZES["dni"])
            draw.text(
                self.POSITIONS["dni"],
                data.dni.upper(),
                font=dni_font,
                fill=text_color
            )

            # Save to bytes
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)

            return buffer.getvalue()

        except LicenseImageGenerationError:
            raise
        except Exception as e:
            raise LicenseImageGenerationError(f"Failed to generate license image: {e}")
