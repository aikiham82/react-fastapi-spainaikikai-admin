"""Tests for the status an insurance reports once its end date is taken into account."""

from datetime import datetime, timedelta

import pytest

from src.domain.entities.insurance import Insurance, InsuranceStatus


def build_insurance(status=InsuranceStatus.ACTIVE, end_date=None):
    return Insurance(
        member_id="member-id",
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=end_date - timedelta(days=365) if end_date else None,
        end_date=end_date,
        status=status,
    )


@pytest.mark.unit
@pytest.mark.domain
class TestInsuranceEffectiveStatus:
    def test_active_insurance_past_its_end_date_is_expired(self):
        insurance = build_insurance(end_date=datetime.utcnow() - timedelta(days=1))

        assert insurance.effective_status == InsuranceStatus.EXPIRED

    def test_active_insurance_before_its_end_date_is_active(self):
        insurance = build_insurance(end_date=datetime.utcnow() + timedelta(days=1))

        assert insurance.effective_status == InsuranceStatus.ACTIVE

    def test_cancelled_insurance_past_its_end_date_stays_cancelled(self):
        insurance = build_insurance(
            status=InsuranceStatus.CANCELLED,
            end_date=datetime.utcnow() - timedelta(days=1),
        )

        assert insurance.effective_status == InsuranceStatus.CANCELLED

    def test_insurance_without_end_date_keeps_its_stored_status(self):
        insurance = build_insurance(end_date=None)

        assert insurance.effective_status == InsuranceStatus.ACTIVE

    def test_effective_status_leaves_the_stored_status_untouched(self):
        insurance = build_insurance(end_date=datetime.utcnow() - timedelta(days=1))

        insurance.effective_status

        assert insurance.status == InsuranceStatus.ACTIVE
