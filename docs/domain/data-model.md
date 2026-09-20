# 🎯 Data model

## 💡 Convention

Persistence is MongoDB. The database is named **`spainaikikai`** (not `aikikai_admin`).

### Collections

| Collection | Holds |
|---|---|
| `users` | accounts and `global_role` |
| `members` | federated members, `club_role`, club link |
| `clubs` | clubs |
| `member_payments` | payments; the **only** source of paid status |
| `transactions` | payment transactions |
| `invoices` | invoices generated from payments |
| `licenses` | federation licence registry, used for `grade_group` |
| `insurances` | accident and RC insurance records |
| `seminars` | seminars |
| `price_configurations` | configurable prices |
| `password_reset_tokens` | reset tokens |

### Datetimes are naive

MongoDB stores **naive** datetimes in this project. Use `datetime.utcnow()`. Never use `datetime.now(timezone.utc)`.

A timezone-aware datetime written into a collection of naive ones compares incorrectly against every existing document, and the failure is silent: queries return the wrong rows rather than raising.

### Licences are not payments

A `licenses` document may exist with `last_payment_id = null`, because licences are bulk-imported from the federation. Paid status comes from `member_payments` only. See [`payment-cycles.md`](payment-cycles.md).

## 🏆 Benefits

- Naming the database explicitly avoids connecting to an empty one and concluding the data is gone.
- One stated rule about datetimes prevents a class of silent query bug.
- Listing what each collection is for makes it obvious which one is authoritative for a question.

## 👀 Examples

### ✅ Good

```python
created_at = datetime.utcnow()
```

### ❌ Bad

```python
created_at = datetime.now(timezone.utc)
```

Stored as an aware datetime among naive ones; range queries over the collection then behave unpredictably.

## 🧐 Real world examples

- [`backend/src/infrastructure/adapters/repositories/`](../../backend/src/infrastructure/adapters/repositories): one adapter per collection.
- [`backend/src/domain/entities/`](../../backend/src/domain/entities): the entities behind them.
- [`mongo-init.js`](../../mongo-init.js): local database initialisation.
- [`docker-compose.yml`](../../docker-compose.yml): local MongoDB on port 27017.

## 🔗 Related agreements

- [`payment-cycles.md`](payment-cycles.md)
- [`roles-and-permissions.md`](roles-and-permissions.md)
- [`../architecture/backend-hexagonal.md`](../architecture/backend-hexagonal.md)
