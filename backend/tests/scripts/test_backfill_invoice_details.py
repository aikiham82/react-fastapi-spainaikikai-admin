from datetime import datetime

from scripts.backfill_invoice_details import plan_backfill

CLUB = {
    "_id": "club-1", "name": "Example Dojo", "address": "Calle Mayor 1", "postal_code": "28001",
    "city": "Madrid", "province": "", "email": "dojo@example.com", "phone": "",
}
PAID_AT = datetime(2026, 10, 8, 9, 30)


def invoice(**overrides):
    return {"_id": "inv-1", "payment_id": "pay-1", "member_id": "club-1", "club_id": "club-1",
            "customer_name": "Example Dojo", "pdf_path": "invoices/factura_2026-000001.pdf", **overrides}


def test_an_old_club_invoice_gets_the_club_details_and_how_it_was_paid():
    changes = plan_backfill(
        [invoice()],
        {"pay-1": {"payment_date": PAID_AT, "payment_method": "redsys"}},
        {"club-1": CLUB},
        {},
    )

    assert changes == [("inv-1", {
        "customer_address": "Calle Mayor 1, 28001 Madrid",
        "customer_email": "dojo@example.com",
        "customer_phone": "",
        "payment_date": PAID_AT,
        "payment_method": "redsys",
        "pdf_path": None,
        "pdf_generated_at": None,
    })]


def test_a_payment_without_a_stored_method_leaves_the_method_blank():
    changes = plan_backfill([invoice()], {"pay-1": {"payment_date": PAID_AT}}, {"club-1": CLUB}, {})

    assert changes[0][1]["payment_method"] == ""


def test_a_member_invoice_takes_the_member_details():
    member = {"_id": "m1", "first_name": "Ana", "last_name": "Example", "email": "ana@example.com",
              "phone": "611111111", "address": "Calle Sol 2", "postal_code": "", "city": "Sevilla", "province": ""}

    changes = plan_backfill(
        [invoice(member_id="m1")], {"pay-1": {"payment_date": PAID_AT, "payment_method": "cash", "member_id": "m1"}},
        {"club-1": CLUB}, {"m1": member},
    )

    assert changes[0][1]["customer_address"] == "Calle Sol 2, Sevilla"
    assert changes[0][1]["customer_phone"] == "611111111"


def test_an_invoice_that_already_has_its_details_is_left_alone():
    assert plan_backfill(
        [invoice(customer_address="Calle Mayor 1", payment_method="redsys")],
        {"pay-1": {"payment_date": PAID_AT, "payment_method": "redsys"}},
        {"club-1": CLUB},
        {},
    ) == []
