from datetime import datetime

from scripts.migrate_autumn_insurance_year import plan_changes


def member_payment(mp_id, payment_type, year, payment_id="payment-1"):
    return {
        "_id": mp_id,
        "payment_id": payment_id,
        "payment_type": payment_type,
        "payment_year": year,
        "status": "completed",
    }


def paid_on(when, payment_id="payment-1"):
    return {payment_id: {"payment_date": when, "created_at": when}}


def test_an_autumn_insurance_recorded_with_the_form_year_moves_to_its_season_year():
    changes = plan_changes(
        [member_payment("mp-1", "seguro_accidentes", 2026), member_payment("mp-2", "seguro_rc", 2025)],
        paid_on(datetime(2026, 10, 5, 15, 44)),
    )

    assert changes == [("mp-1", 2026, 2027), ("mp-2", 2025, 2027)]


def test_licences_and_september_insurances_are_left_alone():
    assert plan_changes(
        [member_payment("mp-1", "licencia_kyu", 2026), member_payment("mp-2", "seguro_accidentes", 2026)],
        paid_on(datetime(2026, 9, 30, 23, 59, 59)),
    ) == []
    assert plan_changes(
        [member_payment("mp-3", "licencia_kyu", 2025)],
        paid_on(datetime(2026, 10, 15)),
    ) == []


def test_an_insurance_without_an_app_payment_is_left_alone():
    assert plan_changes(
        [member_payment("mp-1", "seguro_accidentes", 2026, payment_id="excel-import")],
        paid_on(datetime(2026, 10, 5)),
    ) == []
