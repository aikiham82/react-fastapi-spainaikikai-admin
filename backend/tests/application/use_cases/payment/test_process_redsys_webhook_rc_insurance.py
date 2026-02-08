"""Tests for implicit RC insurance generation in ProcessRedsysWebhookUseCase.

Fukushidoin and Shidoin payments include RC insurance implicitly.
The webhook use case should create synthetic SEGURO_RC MemberPayments
so that GenerateInsuranceFromPaymentUseCase generates RC insurance.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call

from src.domain.entities.member_payment import (
    MemberPayment,
    MemberPaymentStatus,
    MemberPaymentType,
)
from src.domain.entities.insurance import Insurance, InsuranceType, InsuranceStatus
from src.application.use_cases.payment.process_redsys_webhook_use_case import (
    ProcessRedsysWebhookUseCase,
)


@pytest.fixture
def mock_repos():
    """Provide minimal mock repositories for the use case."""
    return {
        "payment_repository": MagicMock(),
        "redsys_service": MagicMock(),
        "license_repository": MagicMock(),
        "insurance_repository": MagicMock(),
    }


def _build_use_case(mock_repos):
    return ProcessRedsysWebhookUseCase(
        payment_repository=mock_repos["payment_repository"],
        redsys_service=mock_repos["redsys_service"],
        license_repository=mock_repos["license_repository"],
        insurance_repository=mock_repos["insurance_repository"],
    )


def _make_member_payment(member_id, payment_type, payment_id="pay1", year=2026):
    return MemberPayment(
        payment_id=payment_id,
        member_id=member_id,
        payment_year=year,
        payment_type=payment_type,
        concept=f"{payment_type.value} - {year}",
        amount=100.0,
        status=MemberPaymentStatus.COMPLETED,
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestImplicitRCInsuranceFromInstructorPayments:
    """Test that _generate_licenses_and_insurance creates RC insurance for instructor types."""

    async def test_fukushidoin_generates_rc_insurance(self, mock_repos):
        """Fukushidoin payment should produce a synthetic SEGURO_RC for insurance generation."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.TITULO_FUKUSHIDOIN),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            # Insurance use case should have been called
            mock_ins_instance.execute.assert_called_once()
            insurance_payments = mock_ins_instance.execute.call_args[0][0]

            # Should contain exactly one synthetic SEGURO_RC payment
            assert len(insurance_payments) == 1
            assert insurance_payments[0].payment_type == MemberPaymentType.SEGURO_RC
            assert insurance_payments[0].member_id == "member1"
            assert insurance_payments[0].amount == 0.0
            assert "titulo_fukushidoin" in insurance_payments[0].concept.lower()

    async def test_shidoin_generates_rc_insurance(self, mock_repos):
        """Shidoin payment should produce a synthetic SEGURO_RC for insurance generation."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.TITULO_SHIDOIN),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            mock_ins_instance.execute.assert_called_once()
            insurance_payments = mock_ins_instance.execute.call_args[0][0]

            assert len(insurance_payments) == 1
            assert insurance_payments[0].payment_type == MemberPaymentType.SEGURO_RC
            assert insurance_payments[0].member_id == "member1"
            assert insurance_payments[0].amount == 0.0
            assert "titulo_shidoin" in insurance_payments[0].concept.lower()

    async def test_no_duplicate_rc_when_explicit_seguro_rc_exists(self, mock_repos):
        """If member already has an explicit SEGURO_RC payment, no synthetic one is added."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.TITULO_FUKUSHIDOIN),
            _make_member_payment("member1", MemberPaymentType.SEGURO_RC),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            mock_ins_instance.execute.assert_called_once()
            insurance_payments = mock_ins_instance.execute.call_args[0][0]

            # Should contain only the explicit SEGURO_RC, not a synthetic one
            assert len(insurance_payments) == 1
            assert insurance_payments[0].payment_type == MemberPaymentType.SEGURO_RC
            assert insurance_payments[0].amount == 100.0  # original amount, not 0

    async def test_fukushidoin_and_shidoin_different_members(self, mock_repos):
        """Multiple instructor payments for different members each get their own RC."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.TITULO_FUKUSHIDOIN),
            _make_member_payment("member2", MemberPaymentType.TITULO_SHIDOIN),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            mock_ins_instance.execute.assert_called_once()
            insurance_payments = mock_ins_instance.execute.call_args[0][0]

            assert len(insurance_payments) == 2
            rc_members = {ip.member_id for ip in insurance_payments}
            assert rc_members == {"member1", "member2"}
            assert all(ip.payment_type == MemberPaymentType.SEGURO_RC for ip in insurance_payments)

    async def test_mixed_payments_generates_license_and_rc_insurance(self, mock_repos):
        """A mix of kyu license + fukushidoin should generate licenses AND RC insurance."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.LICENCIA_KYU),
            _make_member_payment("member2", MemberPaymentType.TITULO_FUKUSHIDOIN),
            _make_member_payment("member3", MemberPaymentType.SEGURO_ACCIDENTES),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            # Licenses: kyu + fukushidoin (both are is_license_payment)
            mock_lic_instance.execute.assert_called_once()
            license_payments = mock_lic_instance.execute.call_args[0][0]
            assert len(license_payments) == 2

            # Insurance: seguro_accidentes (explicit) + synthetic RC for member2
            mock_ins_instance.execute.assert_called_once()
            insurance_payments = mock_ins_instance.execute.call_args[0][0]
            assert len(insurance_payments) == 2
            types = {ip.payment_type for ip in insurance_payments}
            assert types == {MemberPaymentType.SEGURO_ACCIDENTES, MemberPaymentType.SEGURO_RC}

    async def test_no_rc_for_non_instructor_license_types(self, mock_repos):
        """Kyu/Dan license payments should NOT generate implicit RC insurance."""
        uc = _build_use_case(mock_repos)

        member_payments = [
            _make_member_payment("member1", MemberPaymentType.LICENCIA_KYU),
            _make_member_payment("member2", MemberPaymentType.LICENCIA_DAN),
        ]

        with patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateLicensesFromPaymentUseCase"
        ) as MockLicUC, patch(
            "src.application.use_cases.payment.process_redsys_webhook_use_case.GenerateInsuranceFromPaymentUseCase"
        ) as MockInsUC:
            mock_lic_instance = AsyncMock()
            MockLicUC.return_value = mock_lic_instance

            mock_ins_instance = AsyncMock()
            MockInsUC.return_value = mock_ins_instance

            await uc._generate_licenses_and_insurance(member_payments, "pay1", 2026)

            # No insurance payments at all
            mock_ins_instance.execute.assert_not_called()
