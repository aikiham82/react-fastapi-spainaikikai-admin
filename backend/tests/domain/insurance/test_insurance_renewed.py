"""An insurance is renewed when the same member holds a later one of the same type."""

from datetime import datetime

import pytest

from src.domain.entities.insurance import (
    Insurance,
    InsuranceStatus,
    InsuranceType,
    renewed_insurance_ids,
)

pytestmark = [pytest.mark.unit]

SEASON_2026 = datetime(2026, 9, 30, 23, 59, 59)
SEASON_2027 = datetime(2027, 9, 30, 23, 59, 59)


def insurance(
    insurance_id: str,
    end_date: datetime,
    member_id: str = "member-1",
    insurance_type: InsuranceType = InsuranceType.CIVIL_LIABILITY,
    status: InsuranceStatus = InsuranceStatus.ACTIVE,
) -> Insurance:
    return Insurance(
        id=insurance_id,
        member_id=member_id,
        insurance_type=insurance_type,
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        end_date=end_date,
        status=status,
    )


def test_a_later_insurance_renews_the_earlier_one():
    assert renewed_insurance_ids([insurance("old", SEASON_2026), insurance("new", SEASON_2027)]) == {"old"}


def test_another_type_does_not_renew_it():
    accident = insurance("accident", SEASON_2027, insurance_type=InsuranceType.ACCIDENT)
    assert renewed_insurance_ids([insurance("old", SEASON_2026), accident]) == set()


def test_another_member_does_not_renew_it():
    assert renewed_insurance_ids([insurance("old", SEASON_2026), insurance("new", SEASON_2027, "member-2")]) == set()


def test_a_cancelled_insurance_does_not_renew_it():
    cancelled = insurance("new", SEASON_2027, status=InsuranceStatus.CANCELLED)
    assert renewed_insurance_ids([insurance("old", SEASON_2026), cancelled]) == set()


def test_insurances_without_a_member_do_not_renew_each_other():
    assert renewed_insurance_ids([insurance("old", SEASON_2026, None), insurance("new", SEASON_2027, None)]) == set()
