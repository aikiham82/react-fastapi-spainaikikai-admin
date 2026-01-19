from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional
from enum import Enum


class LicenseStatus(str, Enum):
    """License status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    REVOKED = "revoked"


class LicenseType(str, Enum):
    """License type enumeration (legacy - kept for backward compatibility)."""
    DAN = "dan"
    KYU = "kyu"
    INSTRUCTOR = "instructor"


class TechnicalGrade(str, Enum):
    """Technical grade enumeration (Dan or Kyu)."""
    DAN = "dan"
    KYU = "kyu"


class InstructorCategory(str, Enum):
    """Instructor category enumeration."""
    NONE = "none"
    FUKUSHIDOIN = "fukushidoin"  # Assistant instructor
    SHIDOIN = "shidoin"  # Instructor


class AgeCategory(str, Enum):
    """Age category enumeration."""
    INFANTIL = "infantil"  # Children
    ADULTO = "adulto"  # Adult


@dataclass
class License:
    """License domain entity representing a federation license."""
    id: Optional[str] = None
    license_number: str = ""
    member_id: Optional[str] = None
    club_id: Optional[str] = None
    association_id: Optional[str] = None
    license_type: LicenseType = LicenseType.KYU  # Legacy field
    grade: str = ""
    status: LicenseStatus = LicenseStatus.ACTIVE
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    is_renewed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # New category fields for payment calculation
    grado_tecnico: TechnicalGrade = TechnicalGrade.KYU
    categoria_instructor: InstructorCategory = InstructorCategory.NONE
    categoria_edad: AgeCategory = AgeCategory.ADULTO
    last_payment_id: Optional[str] = None  # Track the last payment for this license

    def __post_init__(self):
        self.created_at = self.created_at or datetime.now()
        self.updated_at = self.updated_at or datetime.now()
        """Validate the license entity."""
        if not self.license_number or not self.license_number.strip():
            raise ValueError("License number cannot be empty")
        if not self.grade or not self.grade.strip():
            raise ValueError("Grade cannot be empty")

    def renew(self, new_expiration_date: datetime) -> None:
        """Renew the license."""
        if not new_expiration_date:
            raise ValueError("Expiration date cannot be empty")
        if new_expiration_date <= datetime.now():
            raise ValueError("Expiration date must be in the future")

        self.expiration_date = new_expiration_date
        self.renewal_date = datetime.now()
        self.is_renewed = True
        self.status = LicenseStatus.ACTIVE

    def activate(self) -> None:
        """Activate license."""
        self.status = LicenseStatus.ACTIVE

    def deactivate(self) -> None:
        """Deactivate license."""
        self.status = LicenseStatus.EXPIRED

    @property
    def is_active(self) -> bool:
        """Check if license is currently active."""
        return self.status == LicenseStatus.ACTIVE and not self.is_expired()

    def is_expired(self) -> bool:
        """Check if the license is expired."""
        if self.expiration_date:
            return datetime.now() > self.expiration_date
        return False

    def check_and_update_status(self) -> None:
        """Check and update license status based on expiration date."""
        if self.is_expired() and self.status == LicenseStatus.ACTIVE:
            self.status = LicenseStatus.EXPIRED

    def update_grade(self, new_grade: str) -> None:
        """Update the license grade."""
        if not new_grade or not new_grade.strip():
            raise ValueError("Grade cannot be empty")
        self.grade = new_grade

    def get_price_key(self) -> str:
        """Generate the price configuration key based on license categories.

        Format: grado_tecnico-categoria_instructor-categoria_edad
        Example: "dan-shidoin-adulto", "kyu-none-infantil"
        """
        return f"{self.grado_tecnico.value}-{self.categoria_instructor.value}-{self.categoria_edad.value}"

    def update_categories(
        self,
        grado_tecnico: Optional[TechnicalGrade] = None,
        categoria_instructor: Optional[InstructorCategory] = None,
        categoria_edad: Optional[AgeCategory] = None
    ) -> None:
        """Update license categories.

        Args:
            grado_tecnico: New technical grade (Dan/Kyu).
            categoria_instructor: New instructor category.
            categoria_edad: New age category.
        """
        if grado_tecnico is not None:
            self.grado_tecnico = grado_tecnico
        if categoria_instructor is not None:
            self.categoria_instructor = categoria_instructor
        if categoria_edad is not None:
            self.categoria_edad = categoria_edad
        self.updated_at = datetime.now()

    def record_payment(self, payment_id: str) -> None:
        """Record a payment for this license.

        Args:
            payment_id: The ID of the payment.
        """
        self.last_payment_id = payment_id
        self.updated_at = datetime.now()
