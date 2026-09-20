# 🎯 Payment cycles

## 💡 Convention

There are **two independent payment cycles**. Conflating them is the single most damaging bug this project has had, and it reached production twice.

### 1. Annual licence / cuota

The federation's yearly renewal: `licencia_kyu` or `licencia_dan`, plus the per-club `cuota_club`.

- Signalled by the **"Fecha de envío"** column in the Excel sheet `2026 SIN SUMA CUOTAS`.
- **No send date means the club did not renew**: no licence, no club fee.
- In the 2026 pass only four clubs submitted: Aikido Hanami, Aikimadrid, Dojo Heijoshin, Musubi Azuqueca.

### 2. Seguro de accidentes + seguro RC

A **separate** cycle running roughly 1 October to 30 September.

- Paid independently of the annual renewal and **not** gated on the send date.
- The authoritative coverage list is the sheet **"Seguro de accidentes APP"**.
- A club can hold valid insurance while never having renewed the annual licence.

### Paid status comes from payments, never from entities

`license_paid` and `insurance_paid` derive **only** from completed `MemberPayment` records for the year (`is_license_payment` / `is_insurance_payment`). The federation `License` entity is used **only** for `grade_group` classification.

A `License` entity can exist with no payment behind it, because licences are bulk-imported from the federation with `last_payment_id = null`. Inferring payment from its existence marks unpaid members as paid.

## 🏆 Benefits

- Clubs are billed and displayed according to what they actually paid.
- The two cycles can be reconciled separately, which is how the federation actually operates.
- Deriving status from payments means one source of truth for the Pagos screen.

## 👀 Examples

### ✅ Good: status from completed payments

```python
license_paid = any(
    payment.is_license_payment and payment.is_completed
    for payment in payments_for_year
)
```

### ❌ Bad: status from the licence entity

```python
license_paid = license is not None and license.expiration_date >= end_of_year
```

This is the Muzen Dojo bug of June 2026: about 19 members who had paid only the 15 € `seguro_accidentes` showed "Licencia ✓". Their 2026 licences had been imported from the federation in late 2025 with no associated payment. The overlap between insurance payers and licence holders made it look like insurance was marking licences paid; it was coincidence, and no such coupling exists in the code.

### ❌ Bad: gating both cycles on the send date

The Excel importer originally created `status: "completed"` payments for every roster member, making around 20 clubs appear up to date for 2026. The first correction then over-swung and deleted the insurance payments too, which were legitimate. Both directions were wrong for the same reason: the cycles were treated as one.

## 🧐 Real world examples

- [`backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py`](../../backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py): the authoritative derivation.
- [`backend/scripts/sync/planner.py`](../../backend/scripts/sync/planner.py): `_append_dependent_actions` gates licence and cuota on `fee.send_date`; insurance is emitted regardless.
- [`backend/scripts/sync/writer.py`](../../backend/scripts/sync/writer.py): adds `cuota_club` and the club fee only for submitted clubs.
- [`backend/scripts/sync/constants.py`](../../backend/scripts/sync/constants.py): standard amounts (kyu cuota 15, seguro accidentes 15; dan cuota varies and is never guessed).
- [`backend/tests/scripts/`](../../backend/tests/scripts): `test_planner.py`, `test_excel_loader.py`.

Re-running the importer (idempotent upserts), from `backend/` with `PYTHONPATH=.`:

```bash
python -m scripts.sync_excel_to_prod --excel <file> --env-file .env.production --execute
```

## 🔗 Related agreements

- [`data-model.md`](data-model.md)
- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md)
