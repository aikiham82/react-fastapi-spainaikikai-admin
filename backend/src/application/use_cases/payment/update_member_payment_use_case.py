"""Update MemberPayment use case."""

from datetime import datetime
from typing import Optional

from src.domain.entities.member_payment import (
    PAYMENT_TYPE_LABELS,
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.exceptions.base import BusinessRuleViolationError
from src.domain.exceptions.payment import MemberPaymentNotFoundError, InvalidPaymentDataError
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.payment_repository import PaymentRepositoryPort
from src.application.ports.license_repository import LicenseRepositoryPort
from src.application.ports.insurance_repository import InsuranceRepositoryPort
from src.application.use_cases.insurance.generate_insurance_from_payment_use_case import PAYMENT_TYPE_TO_INSURANCE_TYPE
from src.application.use_cases.license.generate_licenses_from_payment_use_case import PAYMENT_TYPE_TO_LICENSE_ATTRS
from src.domain.entities.insurance import insurance_season


class UpdateMemberPaymentUseCase:
    """Use case for editing a MemberPayment line.

    After editing, recomputes parent Payment.amount = sum of COMPLETED lines.
    """

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        payment_repository: PaymentRepositoryPort,
        license_repository: Optional[LicenseRepositoryPort] = None,
        insurance_repository: Optional[InsuranceRepositoryPort] = None,
    ):
        self.member_payment_repository = member_payment_repository
        self.payment_repository = payment_repository
        self.license_repository = license_repository
        self.insurance_repository = insurance_repository

    async def execute(
        self,
        member_payment_id: str,
        payment_type: Optional[str] = None,
        concept: Optional[str] = None,
        amount: Optional[float] = None,
        status: Optional[str] = None,
        payment_year: Optional[int] = None,
    ) -> MemberPayment:
        mp = await self.member_payment_repository.find_by_id(member_payment_id)
        if not mp:
            raise MemberPaymentNotFoundError(member_payment_id)

        target_type = mp.payment_type
        if payment_type is not None:
            try:
                target_type = MemberPaymentType(payment_type)
            except ValueError:
                raise InvalidPaymentDataError(f"Tipo de pago inválido: {payment_type}")
        target_year = payment_year if payment_year is not None else mp.payment_year
        if (target_type, target_year) != (mp.payment_type, mp.payment_year):
            if await self.member_payment_repository.exists_for_member_year_type(
                mp.member_id, target_year, target_type
            ):
                raise BusinessRuleViolationError(
                    f"Este miembro ya tiene {PAYMENT_TYPE_LABELS[target_type.value]} en {target_year}"
                )
        previous_year = mp.payment_year
        moved_year = target_year != previous_year
        mp.payment_type = target_type
        mp.payment_year = target_year
        if concept is not None:
            mp.concept = concept
        if amount is not None:
            if amount < 0:
                raise InvalidPaymentDataError("El importe no puede ser negativo")
            mp.amount = amount
        if status is not None:
            try:
                mp.status = MemberPaymentStatus(status)
            except ValueError:
                raise InvalidPaymentDataError(f"Estado inválido: {status}")

        mp.updated_at = datetime.utcnow()
        updated_mp = await self.member_payment_repository.update(mp)

        # Recompute parent Payment.amount = sum of COMPLETED lines
        await self._recompute_parent_amount(updated_mp.payment_id)
        if moved_year:
            await self._move_what_it_generated(updated_mp, previous_year)

        return updated_mp

    async def _move_what_it_generated(self, mp: MemberPayment, previous_year: int) -> None:
        """The licence and insurances this payment generated for the member follow the line's year."""
        licence_types = {
            PAYMENT_TYPE_TO_LICENSE_ATTRS[t]["license_type"] for t in mp.covered_types if t in PAYMENT_TYPE_TO_LICENSE_ATTRS
        }
        insurance_types = {
            PAYMENT_TYPE_TO_INSURANCE_TYPE[t] for t in mp.covered_types if t in PAYMENT_TYPE_TO_INSURANCE_TYPE
        }
        if licence_types and self.license_repository:
            for licence in await self.license_repository.find_by_member_id(mp.member_id):
                generated_for_the_line = (
                    licence.last_payment_id == mp.payment_id
                    and licence.license_type in licence_types
                    and licence.expiration_date is not None
                    and licence.expiration_date.year == previous_year
                )
                if generated_for_the_line:
                    licence.update_dates(
                        datetime(mp.payment_year, 1, 1), datetime(mp.payment_year, 12, 31, 23, 59, 59)
                    )
                    await self.license_repository.update(licence)
        if insurance_types and self.insurance_repository:
            insurances = await self.insurance_repository.find_by_member_id(mp.member_id)
            target_start, target_end = insurance_season(mp.payment_year)
            covered = {(i.insurance_type, i.end_date) for i in insurances if i.payment_id != mp.payment_id}
            for insurance in insurances:
                generated_for_the_line = (
                    insurance.payment_id == mp.payment_id and insurance.insurance_type in insurance_types
                )
                if generated_for_the_line and (insurance.insurance_type, target_end) not in covered:
                    insurance.update_dates(target_start, target_end)
                    await self.insurance_repository.update(insurance)

    async def _recompute_parent_amount(self, payment_id: str) -> None:
        """Set Payment.amount = sum of all COMPLETED MemberPayment.amount."""
        lines = await self.member_payment_repository.find_by_payment_id(payment_id)
        completed_total = sum(
            mp.amount for mp in lines
            if mp.status == MemberPaymentStatus.COMPLETED
        )
        parent = await self.payment_repository.find_by_id(payment_id)
        if parent:
            parent.amount = completed_total
            parent.updated_at = datetime.utcnow()
            await self.payment_repository.update(parent)
