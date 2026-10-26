"""Generate the licences and insurance a completed payment pays for."""

import logging
from datetime import datetime
from typing import List, Optional

from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.use_cases.insurance.generate_insurance_from_payment_use_case import GenerateInsuranceFromPaymentUseCase
from src.application.use_cases.license.generate_licenses_from_payment_use_case import GenerateLicensesFromPaymentUseCase
from src.domain.entities.member_payment import TITLE_PAYMENT_TYPES, MemberPayment, MemberPaymentType

logger = logging.getLogger(__name__)


class GenerateLicensesAndInsuranceFromPaymentUseCase:
    """Create or renew License and Insurance entities from completed member payments.

    Fukushidoin and Shidoin payments implicitly include RC insurance,
    so synthetic SEGURO_RC payments are added for those members
    unless an explicit SEGURO_RC payment already exists.

    Failures are logged and swallowed: the payment is already recorded.
    """

    def __init__(
        self,
        license_repository: Optional[LicenseRepositoryPort],
        insurance_repository: Optional[InsuranceRepositoryPort],
    ):
        self.license_repository = license_repository
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        member_payments: List[MemberPayment],
        payment_id: str,
        payment_year: int,
        paid_at: datetime,
    ) -> None:
        license_payments = [mp for mp in member_payments if mp.is_license_payment]
        insurance_payments = [mp for mp in member_payments if mp.is_insurance_payment]

        for ip in member_payments:
            if ip.payment_type not in TITLE_PAYMENT_TYPES:
                continue
            already_has_rc = any(
                mp.member_id == ip.member_id and mp.payment_type == MemberPaymentType.SEGURO_RC
                for mp in member_payments
            )
            if not already_has_rc:
                insurance_payments.append(MemberPayment(
                    payment_id=ip.payment_id,
                    member_id=ip.member_id,
                    payment_year=ip.payment_year,
                    payment_type=MemberPaymentType.SEGURO_RC,
                    concept=f"Seguro RC (incluido en {ip.payment_type.value})",
                    amount=0.0,
                    status=ip.status,
                ))

        if license_payments and self.license_repository:
            try:
                await GenerateLicensesFromPaymentUseCase(self.license_repository).execute(
                    license_payments, payment_id, payment_year
                )
            except Exception:
                logger.exception("Failed to auto-generate licenses for payment %s", payment_id)

        if insurance_payments and self.insurance_repository:
            try:
                await GenerateInsuranceFromPaymentUseCase(self.insurance_repository).execute(
                    insurance_payments, payment_id, paid_at
                )
            except Exception:
                logger.exception("Failed to auto-generate insurance for payment %s", payment_id)
