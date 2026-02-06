"""Generate licenses automatically from completed annual payment."""

import logging
from datetime import datetime
from typing import List

from src.domain.entities.license import (
    License, LicenseType, LicenseStatus,
    TechnicalGrade, InstructorCategory, AgeCategory
)
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType
from src.application.ports.license_repository import LicenseRepositoryPort

logger = logging.getLogger(__name__)

# Mapping from MemberPaymentType to license attributes
PAYMENT_TYPE_TO_LICENSE_ATTRS = {
    MemberPaymentType.LICENCIA_KYU: {
        "technical_grade": TechnicalGrade.KYU,
        "instructor_category": InstructorCategory.NONE,
        "age_category": AgeCategory.ADULTO,
        "license_type": LicenseType.KYU,
        "grade": "Kyu",
    },
    MemberPaymentType.LICENCIA_KYU_INFANTIL: {
        "technical_grade": TechnicalGrade.KYU,
        "instructor_category": InstructorCategory.NONE,
        "age_category": AgeCategory.INFANTIL,
        "license_type": LicenseType.KYU,
        "grade": "Kyu Infantil",
    },
    MemberPaymentType.LICENCIA_DAN: {
        "technical_grade": TechnicalGrade.DAN,
        "instructor_category": InstructorCategory.NONE,
        "age_category": AgeCategory.ADULTO,
        "license_type": LicenseType.DAN,
        "grade": "Dan",
    },
    MemberPaymentType.TITULO_FUKUSHIDOIN: {
        "technical_grade": TechnicalGrade.DAN,
        "instructor_category": InstructorCategory.FUKUSHIDOIN,
        "age_category": AgeCategory.ADULTO,
        "license_type": LicenseType.INSTRUCTOR,
        "grade": "Fukushidoin/Shidoin",
    },
}


class GenerateLicensesFromPaymentUseCase:
    """Generate License entities from completed member payments."""

    def __init__(self, license_repository: LicenseRepositoryPort):
        self.license_repository = license_repository

    async def execute(
        self,
        member_payments: List[MemberPayment],
        payment_id: str,
        payment_year: int,
    ) -> List[License]:
        """Generate licenses for each license-type member payment.

        Args:
            member_payments: List of MemberPayment records (already filtered to license types).
            payment_id: The parent payment ID.
            payment_year: The year of the payment (determines license validity period).

        Returns:
            List of created License entities.
        """
        created_licenses: List[License] = []
        issue_date = datetime(payment_year, 1, 1)
        expiration_date = datetime(payment_year, 12, 31, 23, 59, 59)

        for mp in member_payments:
            attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS.get(mp.payment_type)
            if not attrs:
                continue

            # Idempotency: check if license already exists for this member+year+type
            existing = await self.license_repository.find_active_by_member_year(
                member_id=mp.member_id,
                payment_year=payment_year,
                technical_grade=attrs["technical_grade"].value,
                instructor_category=attrs["instructor_category"].value,
            )
            if existing:
                logger.info(
                    "License already exists for member %s, type %s, year %d — skipping",
                    mp.member_id, mp.payment_type.value, payment_year
                )
                continue

            # Generate auto-incremental license number
            prefix = f"LIC-{payment_year}-"
            count = await self.license_repository.count_by_license_number_prefix(prefix)
            license_number = f"{prefix}{count + 1:04d}"

            license = License(
                license_number=license_number,
                member_id=mp.member_id,
                license_type=attrs["license_type"],
                grade=attrs["grade"],
                status=LicenseStatus.ACTIVE,
                issue_date=issue_date,
                expiration_date=expiration_date,
                technical_grade=attrs["technical_grade"],
                instructor_category=attrs["instructor_category"],
                age_category=attrs["age_category"],
                last_payment_id=payment_id,
            )

            created = await self.license_repository.create(license)
            created_licenses.append(created)
            logger.info(
                "Created license %s for member %s (type: %s, year: %d)",
                license_number, mp.member_id, mp.payment_type.value, payment_year
            )

        return created_licenses
