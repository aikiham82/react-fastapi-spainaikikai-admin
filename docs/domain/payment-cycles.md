# 🎯 Payment cycles

## 💡 Convention

There are **two independent payment cycles**. Conflating them is the single most damaging bug this project has had, and it reached production twice.

### 1. Annual licence / cuota

The federation's yearly renewal: `licencia_kyu` or `licencia_dan`, plus the per-club `cuota_club`.

- Signalled by the **"Fecha de envío"** column in the Excel sheet `2026 SIN SUMA CUOTAS`.
- **No send date means the club did not renew**: no licence, no club fee.
- In the 2026 pass only four clubs submitted: Aikido Hanami, Aikimadrid, Dojo Heijoshin, Musubi Azuqueca.

### 2. Seguro de accidentes + seguro RC

A **separate** cycle running from 1 October to 30 September.

- An insurance paid for payment year N is valid from **1 October N-1 to 30 September N**: the 2026 payment covers 1 October 2025 to 30 September 2026.
- An insurance paid **in the app** covers the season in force on the day it is paid, whatever year the form says: a payment on 2 October 2026 covers 1 October 2026 to 30 September 2027. The form has a single year for licence and insurance, so taking the year literally gave a club paying in autumn an insurance that was already over. The Excel import keeps the payment-year mapping.
- An insurance paid from October to December belongs to **payment year N+1**, the year its season ends (decided 2026-10-20). Duplicate checks compare by payment year, so recording an autumn renewal as year N clashes with the previous season's payment of year N and blocks the renewal: a club renewing on 20 October 2026 got a 400 because the June 2026 insurance, already expired, was "year 2026".
- So an insurance **member payment** records the year of its season, `insurance_season_year(paid_at)`, never the form year; licences and club fee keep the form year. Duplicate checks and paid marks look insurances up by the season in force today (`find_completed_member_payments` in [`completed_member_payments.py`](../../backend/src/application/use_cases/payment/completed_member_payments.py)). The annual payment form proposes N+1 from October to December (`defaultPaymentYear`), and still offers N-1..N+1 for late licences.
- The **Pagos screen keeps payment years literal**: year N shows every payment of payment year N, licences and insurances alike. It opens on the calendar year, offers up to `defaultPaymentYear`, labels each year with its insurance season, and from October points to N+1 where the autumn payments live. Two attempts to show the season in force inside the current year failed review on 2026-10-25: opening on N+1 marked licences still in force as unpaid and emptied the grade groups; reading next season's insurances into year N hid the season that had just ended from every view, counted one insurance in two years and made an insurance registered by hand look unpaid.
- The window is computed in one place, `insurance_season` in [`backend/src/domain/entities/insurance.py`](../../backend/src/domain/entities/insurance.py). Never write a calendar year into an insurance.
- Paid independently of the annual renewal and **not** gated on the send date.
- The authoritative coverage list is the sheet **"Seguro de accidentes APP"**.
- A club can hold valid insurance while never having renewed the annual licence.

### A title includes the RC insurance

A completed `titulo_shidoin` or `titulo_fukushidoin` line of year N covers the RC insurance of season N (`MemberPayment.covered_types`), wherever paid status is derived: summaries, member status, unpaid lists, prefill and the duplicate check when a payment starts. Since the form proposes N+1 from October, a title and its RC land in the same year. Moving a title line to another year also moves the RC insurance it generated, unless that season is already covered by another one.

### Every completed payment generates its licences and insurance

Whatever the channel, a payment that completes calls [`GenerateLicensesAndInsuranceFromPaymentUseCase`](../../backend/src/application/use_cases/payment/generate_licenses_and_insurance_from_payment_use_case.py) with its member lines: it creates or renews the `License`, creates the season `Insurance`, and adds the RC a title includes. Today the Redsys webhook and the manual payment (`RegisterManualPaymentUseCase`) both do. A new payment path that skips it records the payment but leaves the member on "Sin licencia": until October 2026 the manual payment did exactly that.

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
