#!/usr/bin/env python3
"""Give invoices issued before 2026-10-29 the customer and payment details new invoices carry.

Fills address, email, phone, payment date and payment method from the club or
member and the payment, the same way build_invoice_customer does, and drops the
stored PDF so the next download draws it again with the logo.

Dry run by default: prints each change. Pass --apply to back up and write.

Run with: poetry run python scripts/backfill_invoice_details.py [--apply]
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bson import ObjectId, json_util
from dotenv import load_dotenv
import motor.motor_asyncio

from src.application.use_cases.invoice.invoice_customer import customer_from_club, customer_from_member
from src.domain.entities.club import Club
from src.domain.entities.member import Member

BACKUP_DIR = Path.home() / "backups" / "spainaikikai"


CONTACT_FIELDS = ("address", "postal_code", "city", "province", "email", "phone")


def _customer(member_doc, club_doc):
    contact = lambda doc: {key: doc.get(key) or "" for key in CONTACT_FIELDS}
    if member_doc and member_doc.get("first_name"):
        return customer_from_member(Member(
            first_name=member_doc["first_name"], last_name=member_doc.get("last_name") or "", **contact(member_doc),
        ))
    if club_doc and club_doc.get("name"):
        return customer_from_club(Club(name=club_doc["name"], **contact(club_doc)))
    return None


def plan_backfill(
    invoices: List[dict],
    payments_by_id: Dict[str, dict],
    clubs_by_id: Dict[str, dict],
    members_by_id: Dict[str, dict],
) -> List[Tuple[str, dict]]:
    changes = []
    for invoice in invoices:
        payment = payments_by_id.get(invoice.get("payment_id"), {})
        customer = _customer(members_by_id.get(payment.get("member_id")), clubs_by_id.get(invoice.get("club_id")))
        if not customer:
            continue
        details = {
            "customer_name": customer.name,
            "customer_address": customer.address,
            "customer_email": customer.email,
            "customer_phone": customer.phone,
            "payment_date": payment.get("payment_date"),
            "payment_method": payment.get("payment_method") or "",
        }
        if all(invoice.get(key) == value for key, value in details.items()):
            continue
        changes.append((invoice["_id"], {**details, "pdf_path": None, "pdf_generated_at": None}))
    return changes


def _by_id(docs: List[dict]) -> Dict[str, dict]:
    return {str(doc["_id"]): doc for doc in docs}


def _object_ids(values) -> List[ObjectId]:
    return [ObjectId(v) for v in values if ObjectId.is_valid(v or "")]


async def main(apply: bool) -> None:
    load_dotenv()
    client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URL"])
    db = client[os.environ["DATABASE_NAME"]]
    await client.server_info()
    host, port = client.address
    print(f"Target: {host}:{port} / {db.name}")

    invoices = await db.invoices.find().to_list(None)
    payments = await db.transactions.find({"_id": {"$in": _object_ids(i.get("payment_id") for i in invoices)}}).to_list(None)
    clubs = await db.clubs.find({"_id": {"$in": _object_ids(i.get("club_id") for i in invoices)}}).to_list(None)
    members = await db.members.find({"_id": {"$in": _object_ids(p.get("member_id") for p in payments)}}).to_list(None)

    changes = plan_backfill(invoices, _by_id(payments), _by_id(clubs), _by_id(members))
    invoices_by_id = {doc["_id"]: doc for doc in invoices}
    for invoice_id, fields in changes:
        number = invoices_by_id[invoice_id].get("invoice_number")
        print(f"{number}: {fields['customer_address'] or '-'} | {fields['customer_email'] or '-'} | "
              f"{fields['customer_phone'] or '-'} | {fields['payment_method'] or '-'} | {fields['payment_date']}")
    print(f"{len(changes)} of {len(invoices)} invoices to fill")

    if not apply or not changes:
        return

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / f"backup-invoice-details-{datetime.utcnow():%Y%m%d-%H%M%S}.json"
    backup_path.write_text(json_util.dumps([invoices_by_id[invoice_id] for invoice_id, _ in changes]))
    print(f"Backup: {backup_path}")

    for invoice_id, fields in changes:
        await db.invoices.update_one({"_id": invoice_id}, {"$set": {**fields, "updated_at": datetime.utcnow()}})
    filled = await db.invoices.count_documents({"_id": {"$in": [i for i, _ in changes]}, "customer_email": {"$ne": ""}})
    print(f"Written. Invoices with an email now: {filled} of {len(changes)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="back up and write the changes")
    asyncio.run(main(parser.parse_args().apply))
