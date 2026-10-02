"""Tests for the web readers that report the insurance status derived from the end date."""

from datetime import datetime, timedelta

import pytest

from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType
from src.infrastructure.web.mappers_insurance import InsuranceMapper
from src.infrastructure.web.routers.members import _build_insurance_summary


def stored_as_active(end_date, insurance_type=InsuranceType.ACCIDENT):
    return Insurance(
        id="insurance-id",
        member_id="member-id",
        insurance_type=insurance_type,
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=end_date - timedelta(days=365),
        end_date=end_date,
        status=InsuranceStatus.ACTIVE,
    )


YESTERDAY = datetime.utcnow() - timedelta(days=1)
TOMORROW = datetime.utcnow() + timedelta(days=1)


@pytest.mark.unit
class TestInsuranceMapperStatus:
    def test_response_reports_expired_once_the_end_date_has_passed(self):
        response = InsuranceMapper.to_response_dto(stored_as_active(YESTERDAY))

        assert response.status == "expired"

    def test_response_reports_active_while_the_end_date_is_ahead(self):
        response = InsuranceMapper.to_response_dto(stored_as_active(TOMORROW))

        assert response.status == "active"


@pytest.mark.unit
class TestMemberInsuranceSummaryStatus:
    def test_expired_insurance_is_not_counted_as_active(self):
        summary = _build_insurance_summary([stored_as_active(YESTERDAY)])

        assert summary.has_accident is True
        assert summary.accident_status == "expired"

    def test_current_insurance_wins_over_an_expired_one(self):
        summary = _build_insurance_summary([
            stored_as_active(YESTERDAY, InsuranceType.CIVIL_LIABILITY),
            stored_as_active(TOMORROW, InsuranceType.CIVIL_LIABILITY),
        ])

        assert summary.rc_status == "active"
