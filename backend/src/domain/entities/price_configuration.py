"""Price configuration domain entity for license pricing."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import re


@dataclass
class PriceConfiguration:
    """Price configuration domain entity.

    Stores configurable prices for license types based on category combinations.
    The key format is: "grado_tecnico-categoria_instructor-categoria_edad"
    Examples: "dan-none-adulto", "kyu-fukushidoin-infantil"
    """

    id: Optional[str] = None
    key: str = ""
    price: float = 0.0
    description: str = ""
    is_active: bool = True
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Valid values for each category
    VALID_GRADO_TECNICO = {"dan", "kyu"}
    VALID_CATEGORIA_INSTRUCTOR = {"none", "fukushidoin", "shidoin"}
    VALID_CATEGORIA_EDAD = {"infantil", "adulto"}

    def __post_init__(self):
        """Validate price configuration entity."""
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()

        if not self.key or not self.key.strip():
            raise ValueError("Price configuration key cannot be empty")

        self._validate_key_format()

        if self.price < 0:
            raise ValueError("Price cannot be negative")

    def _validate_key_format(self) -> None:
        """Validate the key format matches expected pattern.

        Expected format: grado_tecnico-categoria_instructor-categoria_edad
        Example: "dan-shidoin-adulto"

        Raises:
            ValueError: If key format is invalid.
        """
        parts = self.key.lower().split("-")

        if len(parts) != 3:
            raise ValueError(
                f"Invalid key format: '{self.key}'. "
                "Expected format: grado_tecnico-categoria_instructor-categoria_edad"
            )

        grado, instructor, edad = parts

        if grado not in self.VALID_GRADO_TECNICO:
            raise ValueError(
                f"Invalid grado_tecnico: '{grado}'. "
                f"Valid values: {self.VALID_GRADO_TECNICO}"
            )

        if instructor not in self.VALID_CATEGORIA_INSTRUCTOR:
            raise ValueError(
                f"Invalid categoria_instructor: '{instructor}'. "
                f"Valid values: {self.VALID_CATEGORIA_INSTRUCTOR}"
            )

        if edad not in self.VALID_CATEGORIA_EDAD:
            raise ValueError(
                f"Invalid categoria_edad: '{edad}'. "
                f"Valid values: {self.VALID_CATEGORIA_EDAD}"
            )

    @classmethod
    def generate_key(
        cls,
        grado_tecnico: str,
        categoria_instructor: str,
        categoria_edad: str
    ) -> str:
        """Generate a price configuration key from category values.

        Args:
            grado_tecnico: Technical grade (dan/kyu).
            categoria_instructor: Instructor category (none/fukushidoin/shidoin).
            categoria_edad: Age category (infantil/adulto).

        Returns:
            The generated key string.
        """
        return f"{grado_tecnico.lower()}-{categoria_instructor.lower()}-{categoria_edad.lower()}"

    def activate(self) -> None:
        """Activate this price configuration."""
        self.is_active = True
        self.updated_at = datetime.now()

    def deactivate(self) -> None:
        """Deactivate this price configuration."""
        self.is_active = False
        self.updated_at = datetime.now()

    def update_price(self, new_price: float) -> None:
        """Update the price.

        Args:
            new_price: The new price value.

        Raises:
            ValueError: If the new price is negative.
        """
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        self.price = new_price
        self.updated_at = datetime.now()

    def is_valid_now(self) -> bool:
        """Check if this price configuration is currently valid.

        Returns:
            True if active and within valid date range.
        """
        if not self.is_active:
            return False

        now = datetime.now()

        if self.valid_from and now < self.valid_from:
            return False

        if self.valid_until and now > self.valid_until:
            return False

        return True

    @property
    def grado_tecnico(self) -> str:
        """Extract grado_tecnico from key."""
        return self.key.split("-")[0]

    @property
    def categoria_instructor(self) -> str:
        """Extract categoria_instructor from key."""
        return self.key.split("-")[1]

    @property
    def categoria_edad(self) -> str:
        """Extract categoria_edad from key."""
        return self.key.split("-")[2]
