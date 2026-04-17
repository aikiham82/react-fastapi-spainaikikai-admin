from datetime import date

from scripts.sync.excel_loader import (
    ExcelFeeRow,
    ExcelInsuranceRow,
    ExcelMemberRow,
)
from scripts.sync.planner import Planner


def excel_member(num="100", dni="12345678A", first="Juan", last1="Garcia",
                 last2="Lopez", club_id="club_a", birth=None, email="",
                 club_name="Club A"):
    return ExcelMemberRow(
        num_socio=num, first_name=first, last1=last1, last2=last2,
        dni_raw=dni, email=email, phone="", birth_date=birth,
        address="", city="", province="", postal_code="", country="Spain",
        club_id=club_id, club_name=club_name,
    )


def excel_fee(num="100", cuota=70, seg_acc=15, rc=True, grade_type="dan", nivel=1):
    return ExcelFeeRow(
        num_socio=num, grade_level=nivel, grade_type=grade_type,
        instructor="", cuota_anual=cuota, seguro_accidentes=seg_acc,
        seguro_rc_flag=rc, send_date=None,
    )


def prod_member(_id="p1", dni="12345678A", first="Juan", last="Garcia Lopez",
                club_id="club_a"):
    return {"_id": _id, "first_name": first, "last_name": last,
            "dni": dni, "club_id": club_id}


def test_matched_member_produces_update_action():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee()},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.member_updates) == 1
    assert plan.member_updates[0]["prod_id"] == "p1"
    assert plan.member_updates[0]["fields"]["dni"] == "12345678A"


def test_unmatched_member_with_dni_produces_insert():
    p = Planner(
        excel_members=[excel_member(dni="99999999Z", club_id="new_club")],
        excel_fees={"100": excel_fee()},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.member_inserts) == 1
    assert plan.member_inserts[0]["dni"] == "99999999Z"
    assert plan.member_inserts[0]["status"] == "active"


def test_empty_club_no_dni_is_skipped():
    p = Planner(
        excel_members=[excel_member(dni="", club_id="", club_name="")],
        excel_fees={}, excel_insurances=[],
        prod_members=[], prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.skipped) == 1
    assert plan.skipped[0]["reason"] == "empty_club_no_dni"


def test_new_club_name_produces_club_insert_and_member_insert():
    """Empty club_id + club_name not in prod → emit club_insert + member_insert."""
    p = Planner(
        excel_members=[excel_member(dni="99999999Z", club_id="", club_name="AIKIDO HANAMI")],
        excel_fees={"100": excel_fee()}, excel_insurances=[],
        prod_members=[], prod_licenses={}, prod_insurances={}, prod_payments={},
        prod_clubs=[],
    )
    plan = p.build()
    assert len(plan.club_inserts) == 1
    assert plan.club_inserts[0]["name"] == "Aikido Hanami"
    assert plan.club_inserts[0]["__ref"].startswith("__new_club__:")
    assert len(plan.member_inserts) == 1
    assert plan.member_inserts[0]["club_id"].startswith("__new_club__:")


def test_club_name_matches_existing_prod_club_by_fuzzy():
    """Empty club_id + club_name matches prod → reuse existing club_id."""
    p = Planner(
        excel_members=[excel_member(dni="99999999Z", club_id="", club_name="AIKIDO MADRID")],
        excel_fees={"100": excel_fee()}, excel_insurances=[],
        prod_members=[], prod_licenses={}, prod_insurances={}, prod_payments={},
        prod_clubs=[{"_id": "prod_club_1", "name": "Aikido Madrid"}],
    )
    plan = p.build()
    assert len(plan.club_inserts) == 0
    assert len(plan.member_inserts) == 1
    assert plan.member_inserts[0]["club_id"] == "prod_club_1"


def test_duplicate_new_club_names_emit_single_insert():
    """Multiple members referencing the same new club share one club_insert."""
    p = Planner(
        excel_members=[
            excel_member(num="1", dni="11111111A", club_id="", club_name="AIKIDO HANAMI"),
            excel_member(num="2", dni="22222222B", club_id="", club_name="AIKIDO HANAMI"),
        ],
        excel_fees={
            "1": excel_fee(num="1"),
            "2": excel_fee(num="2"),
        },
        excel_insurances=[],
        prod_members=[], prod_licenses={}, prod_insurances={}, prod_payments={},
        prod_clubs=[],
    )
    plan = p.build()
    assert len(plan.club_inserts) == 1
    assert len(plan.member_inserts) == 2


def test_empty_excel_field_does_not_overwrite_prod():
    p = Planner(
        excel_members=[excel_member(email="")],
        excel_fees={"100": excel_fee()}, excel_insurances=[],
        prod_members=[{**prod_member(), "email": "real@x.es"}],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert "email" not in plan.member_updates[0]["fields"]


def test_payments_created_for_matched_member():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(cuota=70, seg_acc=15, rc=True, grade_type="dan")},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    types = sorted(a["payment_type"] for a in plan.payment_upserts)
    assert types == ["licencia_dan", "seguro_accidentes", "seguro_rc"]
    amounts = {a["payment_type"]: a["amount"] for a in plan.payment_upserts}
    assert amounts["licencia_dan"] == 70
    assert amounts["seguro_accidentes"] == 15


def test_rc_payment_omitted_when_flag_false():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(rc=False)},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    types = {a["payment_type"] for a in plan.payment_upserts}
    assert "seguro_rc" not in types


def test_license_upsert_for_matched_member():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(grade_type="dan", nivel=3)},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.license_upserts) == 1
    lic = plan.license_upserts[0]
    assert lic["license_type"] == "dan"
    assert lic["grade"] == "3º Dan"
    assert lic["technical_grade"] == "dan"
