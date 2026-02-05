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

    # Valid values for each category (using English names internally)
    VALID_TECHNICAL_GRADE = {"dan", "kyu"}
    VALID_INSTRUCTOR_CATEGORY = {"none", "fukushidoin", "shidoin"}
    VALID_AGE_CATEGORY = {"infantil", "adulto"}

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

        Expected format: technical_grade-instructor_category-age_category
        Example: "dan-shidoin-adulto"

        Raises:
            ValueError: If key format is invalid.
        """
        parts = self.key.lower().split("-")

        if len(parts) != 3:
            raise ValueError(
                f"Invalid key format: '{self.key}'. "
                "Expected format: technical_grade-instructor_category-age_category"
            )

        technical_grade, instructor_category, age_category = parts

        if technical_grade not in self.VALID_TECHNICAL_GRADE:
            raise ValueError(
                f"Invalid technical_grade: '{technical_grade}'. "
                f"Valid values: {self.VALID_TECHNICAL_GRADE}"
            )

        if instructor_category not in self.VALID_INSTRUCTOR_CATEGORY:
            raise ValueError(
                f"Invalid instructor_category: '{instructor_category}'. "
                f"Valid values: {self.VALID_INSTRUCTOR_CATEGORY}"
            )

        if age_category not in self.VALID_AGE_CATEGORY:
            raise ValueError(
                f"Invalid age_category: '{age_category}'. "
                f"Valid values: {self.VALID_AGE_CATEGORY}"
            )

    @classmethod
    def generate_key(
        cls,
        technical_grade: str,
        instructor_category: str,
        age_category: str
    ) -> str:
        """Generate a price configuration key from category values.

        Args:
            technical_grade: Technical grade (dan/kyu).
            instructor_category: Instructor category (none/fukushidoin/shidoin).
            age_category: Age category (infantil/adulto).

        Returns:
            The generated key string.
        """
        return f"{technical_grade.lower()}-{instructor_category.lower()}-{age_category.lower()}"

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
    def technical_grade(self) -> str:
        """Extract technical_grade from key."""
        return self.key.split("-")[0]

    @property
    def instructor_category(self) -> str:
        """Extract instructor_category from key."""
        return self.key.split("-")[1]

    @property
    def age_category(self) -> str:
        """Extract age_category from key."""
        return self.key.split("-")[2]
