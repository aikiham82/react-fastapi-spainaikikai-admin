# 🎯 A deregistered member's licence is history, not an alert

## 💡 Convention

A licence whose member is de baja (`member.status == "inactive"`) is never an alert: it reads grey **"De baja"** with the `Ban` icon, offers no "Renovar", sorts last and is left out of every expired or expiring count (list chips, the Club menu badge, Inicio). Only active members' licences can be "Caducada" or "Caduca pronto".

## 🏆 Benefits

- On 2026-10-27 Musubi Aikido Murcia saw six red "Caducada" rows with "Renovar 2027" and a red 6 on the Club menu. All six were members who had left in 2025, so the club was being asked to renew people who no longer train.
- Directors trust the red: if it only appears when there is something to do, they act on it.
- Keeping the rows (grey) instead of hiding them keeps the licence history visible.

## 👀 Examples

### ✅ Good: decide by the member, then by the date

```ts
if (isDeregistered(license)) return { tone: 'neutral', label: 'De baja', icon: Ban };
const urgency = getUrgency(license, now);
```

```python
expired_licenses_count = await db["licenses"].count_documents({
    "member_id": {"$in": active_member_ids},
    "expiration_date": {"$lt": now},
})
```

### ❌ Bad: counting every licence past its date

```python
await db["licenses"].count_documents({**license_filter, "expiration_date": {"$lt": now}})
```

130 of the 1,203 licences in production belonged to inactive members on 2026-10-27; this query reported all of them as expired.

## 🧐 Real world examples

- [`frontend/src/features/licenses/utils/licenseStatus.ts`](../../frontend/src/features/licenses/utils/licenseStatus.ts): `isDeregistered`, `getStatusPresentation`, `sortByUrgency`.
- [`backend/src/infrastructure/web/routers/licenses.py`](../../backend/src/infrastructure/web/routers/licenses.py): `_populate_member_names` returns `member_status`.
- [`backend/src/infrastructure/web/routers/dashboard.py`](../../backend/src/infrastructure/web/routers/dashboard.py): expired and expiring counts use `active_member_ids`.

## 🔗 Related agreements

- [`a-club-is-switched-off-only-by-deregistration.md`](a-club-is-switched-off-only-by-deregistration.md): the same "De baja" badge for clubs.
- [`payment-cycles.md`](payment-cycles.md): what "Renovar" pays.
- [`validity-follows-dates.md`](validity-follows-dates.md)
